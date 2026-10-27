import { Router } from 'express';
import { matchedData, query } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import { requireAuth } from '../lib/auth.js';
import { AppError, notFound } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { validate } from '../lib/validate.js';

export const geoRouter = Router();

const CACHE_TTL_MS = 7 * 24 * 3600 * 1000;
const CACHE_MAX = 500;
const cache = new Map();

// Nominatim's usage policy asks for at most one request per second, so calls are serialised
// server-side and results are cached: a class of students searching the same places stays cheap.
let nextSlot = 0;
async function waitForSlot() {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + 1100;
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
}

function cached(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function remember(key, value) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
  return value;
}

function labelOf(place) {
  const address = place.address || {};
  const street = address.road || address.pedestrian || address.footway || address.neighbourhood || address.suburb || address.quarter || address.hamlet;
  const city = address.city || address.town || address.village || address.municipality || address.county || address.state;
  const name = place.name && place.name !== place.display_name ? place.name : '';
  const parts = [...new Set([name || street, city].filter(Boolean))];
  return parts.join(', ') || (place.display_name || '').split(',').slice(0, 2).join(', ').trim() || 'Point sélectionné';
}

async function nominatim(path, params) {
  await waitForSlot();
  const url = new URL(`${config.geoUrl.replace(/\/$/, '')}${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  let res;
  try {
    res = await fetch(url, {
      headers: {
        'User-Agent': 'CampusHub/1.0 (student project; contact: no-reply@campus.tn)',
        'Accept-Language': 'fr',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(6000),
    });
  } catch (err) {
    logger.warn({ reason: err.name === 'TimeoutError' ? 'timeout' : err.message }, 'geocoding_unavailable');
    throw new AppError(504, 'GEO_INDISPONIBLE', 'La recherche de lieux met trop de temps. Réessayez ou placez le point sur la carte.');
  }
  if (!res.ok) {
    logger.warn({ status: res.status }, 'geocoding_failed');
    throw new AppError(502, 'GEO_INDISPONIBLE', 'La recherche de lieux est momentanément indisponible.');
  }
  return res.json();
}

function haversineKm(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

// Dense traffic makes the straight-line distance optimistic: 1.35 is the usual road
// detour factor and 30 km/h the average urban speed. Rounded up to 5 minutes.
function estimateMinutes(km) {
  return Math.min(240, Math.max(5, Math.ceil(((km * 1.35) / 30) * (60 / 5)) * 5));
}

async function geocodePlace(q) {
  const key = `place:${q.toLowerCase()}`;
  const hit = cached(key);
  if (hit) return hit;
  const places = await nominatim('/search', {
    q,
    format: 'jsonv2',
    limit: '1',
    countrycodes: 'tn',
    'accept-language': 'fr',
  });
  const place = places?.[0];
  if (!place) throw notFound(`Aucun lieu trouvé pour « ${q} ».`);
  return remember(key, { lat: Number(place.lat), lng: Number(place.lon) });
}

async function roadRoute(depart, arrivee) {
  const key = `route:${depart.lat.toFixed(4)},${depart.lng.toFixed(4)};${arrivee.lat.toFixed(4)},${arrivee.lng.toFixed(4)}`;
  const hit = cached(key);
  if (hit) return hit;

  const base = config.routingUrl.replace(/\/$/, '');
  const url = `${base}/route/v1/driving/${depart.lng},${depart.lat};${arrivee.lng},${arrivee.lat}?overview=false`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const route = (await res.json()).routes?.[0];
    if (!route) throw new Error('no route');
    return remember(key, {
      dureeMinutes: Math.min(240, Math.max(5, Math.round(route.duration / 60))),
      distanceKm: Math.round(route.distance / 100) / 10,
      source: 'route',
    });
  } catch (err) {
    logger.warn({ reason: err.name === 'TimeoutError' ? 'timeout' : err.message }, 'routing_unavailable');
    // Do not cache the fallback: the next request may reach the routing engine again.
    const km = haversineKm(depart, arrivee);
    return { dureeMinutes: estimateMinutes(km), distanceKm: Math.round(km * 10) / 10, source: 'estimation' };
  }
}

const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => config.isTest,
  handler: (req, res) => res.status(429).json({ error: { code: 'TROP_DE_REQUETES', message: 'Trop de recherches de lieux. Réessayez dans une minute.' } }),
});

geoRouter.get(
  '/search',
  requireAuth(),
  limiter,
  validate(query('q').trim().isLength({ min: 3, max: 120 }).withMessage('Saisissez au moins 3 caractères.')),
  async (req, res) => {
    const { q } = matchedData(req, { locations: ['query'] });
    const key = `search:${q.toLowerCase()}`;
    const hit = cached(key);
    if (hit) return res.json(hit);

    const places = await nominatim('/search', {
      q,
      format: 'jsonv2',
      addressdetails: '1',
      limit: '5',
      countrycodes: 'tn',
      'accept-language': 'fr',
    });
    const payload = {
      resultats: places.map((place) => ({
        label: labelOf(place),
        detail: place.display_name,
        lat: Number(place.lat),
        lng: Number(place.lon),
      })),
    };
    remember(key, payload);
    res.json(payload);
  },
);

geoRouter.get(
  '/reverse',
  requireAuth(),
  limiter,
  validate(
    query('lat').isFloat({ min: -90, max: 90 }).withMessage('Latitude invalide.').toFloat(),
    query('lng').isFloat({ min: -180, max: 180 }).withMessage('Longitude invalide.').toFloat(),
  ),
  async (req, res) => {
    const { lat, lng } = matchedData(req, { locations: ['query'] });
    const key = `reverse:${lat.toFixed(4)},${lng.toFixed(4)}`;
    const hit = cached(key);
    if (hit) return res.json(hit);

    const place = await nominatim('/reverse', {
      lat: String(lat),
      lon: String(lng),
      format: 'jsonv2',
      addressdetails: '1',
      zoom: '17',
      'accept-language': 'fr',
    });
    if (!place || place.error) throw notFound('Aucun lieu à cet endroit.');
    const payload = { label: labelOf(place), detail: place.display_name, lat, lng };
    remember(key, payload);
    res.json(payload);
  },
);

geoRouter.get(
  '/itineraire',
  requireAuth(),
  limiter,
  validate(
    query('depart').optional().trim().isLength({ min: 3, max: 120 }).withMessage('Saisissez un départ d’au moins 3 caractères.'),
    query('arrivee').optional().trim().isLength({ min: 3, max: 120 }).withMessage('Saisissez une arrivée d’au moins 3 caractères.'),
    query('departLat').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude de départ invalide.').toFloat(),
    query('departLng').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude de départ invalide.').toFloat(),
    query('arriveeLat').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude d’arrivée invalide.').toFloat(),
    query('arriveeLng').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude d’arrivée invalide.').toFloat(),
  ),
  async (req, res) => {
    const q = matchedData(req, { locations: ['query'] });
    const coords = [q.departLat, q.departLng, q.arriveeLat, q.arriveeLng];
    const withCoords = coords.every((value) => value !== undefined);
    if (!withCoords && coords.some((value) => value !== undefined)) {
      throw new AppError(400, 'PARAMETRES_INVALIDES', 'Coordonnées de départ et d’arrivée incomplètes.');
    }

    let depart;
    let arrivee;
    if (withCoords) {
      depart = { lat: q.departLat, lng: q.departLng };
      arrivee = { lat: q.arriveeLat, lng: q.arriveeLng };
    } else if (q.depart && q.arrivee) {
      [depart, arrivee] = await Promise.all([geocodePlace(q.depart), geocodePlace(q.arrivee)]);
    } else {
      throw new AppError(400, 'PARAMETRES_INVALIDES', 'Renseignez le départ et l’arrivée.');
    }

    res.json(await roadRoute(depart, arrivee));
  },
);
