import { useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Crosshair, Loader2, MapPin, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { get } from '@/lib/api';
import { cn } from '@/lib/utils';

export const TUNIS_CENTER = [36.8065, 10.1815];
const START_ICON = L.divIcon({
  className: 'ch-map-pin',
  html: '<span class="ch-map-pin__dot ch-map-pin__dot--start"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});
const END_ICON = L.divIcon({
  className: 'ch-map-pin',
  html: '<span class="ch-map-pin__dot ch-map-pin__dot--end"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const hasPoint = (p) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng));
const latLng = (p) => [Number(p.lat), Number(p.lng)];

export function distanceKm(a, b) {
  if (!hasPoint(a) || !hasPoint(b)) return null;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export function formatDistance(km) {
  if (km === null || km === undefined) return null;
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(km)} km`;
}

function FitBounds({ points }) {
  const map = useMap();
  const key = points.map((p) => p.join(',')).join('|');
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) map.setView(points[0], 14, { animate: false });
    else map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 15, animate: false });
  }, [key, map]);
  return null;
}

function ClickToPick({ onPick }) {
  useMapEvents({
    click: (event) => onPick?.(event.latlng),
  });
  return null;
}

// Real Leaflet controls stop click propagation so picking on the map doesn't fire
// when the user presses "Ma position". Reproduce that for our React buttons.
function MapControl({ children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    L.DomEvent.disableClickPropagation(ref.current);
    L.DomEvent.disableScrollPropagation(ref.current);
  }, []);
  return (
    <div ref={ref} className="leaflet-top leaflet-right">
      <div className="leaflet-control">{children}</div>
    </div>
  );
}

function Pins({ depart, arrivee, departLabel, arriveeLabel }) {
  return (
    <>
      {hasPoint(depart) && (
        <Marker position={latLng(depart)} icon={START_ICON}>
          <Tooltip direction="top" offset={[0, -10]}>
            Départ · {departLabel || 'point sélectionné'}
          </Tooltip>
        </Marker>
      )}
      {hasPoint(arrivee) && (
        <Marker position={latLng(arrivee)} icon={END_ICON}>
          <Tooltip direction="top" offset={[0, -10]}>
            Arrivée · {arriveeLabel || 'point sélectionné'}
          </Tooltip>
        </Marker>
      )}
    </>
  );
}

function MapCanvas({ depart, arrivee, departLabel, arriveeLabel, onPick, height, mapRef, children }) {
  const points = [depart, arrivee].filter(hasPoint).map(latLng);
  const center = points[0] || TUNIS_CENTER;
  return (
    <div className="relative isolate overflow-hidden rounded-md border" style={{ height }} role="region" aria-label="Carte interactive du trajet">
      <MapContainer ref={mapRef} center={center} zoom={points.length ? 13 : 11} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Pins depart={depart} arrivee={arrivee} departLabel={departLabel} arriveeLabel={arriveeLabel} />
        {points.length > 1 && (
          <Polyline positions={points} pathOptions={{ color: '#2547d0', weight: 4, opacity: 0.8, dashArray: '10 8' }} />
        )}
        <FitBounds points={points} />
        {onPick && <ClickToPick onPick={onPick} />}
        {children}
      </MapContainer>
    </div>
  );
}

export function RideMap({ depart, arrivee, departLabel, arriveeLabel, height = 260, className }) {
  const km = distanceKm(depart, arrivee);
  if (!hasPoint(depart) && !hasPoint(arrivee)) return null;
  return (
    <figure className={cn('flex flex-col gap-2', className)}>
      <MapCanvas depart={depart} arrivee={arrivee} departLabel={departLabel} arriveeLabel={arriveeLabel} height={height} />
      <figcaption className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="size-3.5" aria-hidden="true" />
          {km !== null ? `Environ ${formatDistance(km)} à vol d’oiseau` : 'Trajet sur la carte'}
        </span>
        {hasPoint(depart) && hasPoint(arrivee) && (
          <a
            className="font-medium text-primary hover:underline"
            href={`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${depart.lat}%2C${depart.lng}%3B${arrivee.lat}%2C${arrivee.lng}`}
            target="_blank"
            rel="noreferrer"
          >
            Itinéraire routier ↗
          </a>
        )}
      </figcaption>
    </figure>
  );
}

export function RideMapPicker({ id, depart, arrivee, departLabel, arriveeLabel, onChange, height = 260 }) {
  const autoId = useId();
  const inputId = id || autoId;
  const [active, setActive] = useState('depart');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 450);
    return () => clearTimeout(timer);
  }, [search]);

  const results = useQuery({
    queryKey: ['geo-search', debounced],
    queryFn: () => get('/geo/search', { q: debounced }),
    enabled: debounced.length >= 3,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  const activePoint = active === 'depart' ? depart : arrivee;
  const km = distanceKm(depart, arrivee);

  const choose = (point) => {
    onChange(active, point);
    setSearch('');
    setDebounced('');
    setOpen(false);
    mapRef.current?.setView([point.lat, point.lng], 15, { animate: true });
  };

  const reverse = async (part, point) => {
    onChange(part, point);
    try {
      const place = await get('/geo/reverse', { lat: point.lat, lng: point.lng });
      onChange(part, { ...point, label: place.label });
    } catch {
      // The coordinate is still valid: keep it and let the user edit the label by hand.
    }
  };

  const pick = (latlng) => reverse(active, { lat: latlng.lat, lng: latlng.lng });

  const locate = () => {
    if (!navigator.geolocation) {
      toast.error('La géolocalisation n’est pas disponible dans ce navigateur.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const point = { lat: position.coords.latitude, lng: position.coords.longitude };
        mapRef.current?.setView([point.lat, point.lng], 16, { animate: true });
        reverse(active, point);
      },
      () => {
        setLocating(false);
        toast.error('Impossible de vous localiser. Vérifiez l’autorisation du navigateur ou placez le point sur la carte.');
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const showResults = open && debounced.length >= 3;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Point à placer sur la carte">
        {[
          ['depart', 'Départ', depart],
          ['arrivee', 'Arrivée', arrivee],
        ].map(([part, label, point]) => (
          <button
            key={part}
            type="button"
            aria-pressed={active === part}
            onClick={() => setActive(part)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors',
              active === part ? 'border-primary bg-primary-soft text-primary-soft-foreground' : 'bg-card text-foreground-2 hover:bg-accent',
            )}
          >
            <span className={cn('size-2 rounded-full', part === 'depart' ? 'bg-primary' : 'bg-success')} aria-hidden="true" />
            {label}
            {hasPoint(point) && <span className="sr-only"> (position placée)</span>}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-muted-foreground">Cliquez sur la carte</span>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          id={inputId}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.preventDefault();
            if (event.key === 'Escape') setOpen(false);
          }}
          placeholder={`Rechercher le point de ${active === 'depart' ? 'départ' : 'arrivée'}`}
          className="pl-8"
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={showResults}
          aria-controls={showResults ? `${inputId}-results` : undefined}
        />
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setOpen(false);
            }}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            aria-label="Effacer la recherche"
          >
            <X className="size-3.5" />
          </button>
        )}
        {showResults && (
          <div id={`${inputId}-results`} role="listbox" aria-label="Lieux trouvés" className="absolute inset-x-0 top-full z-[500] mt-1 overflow-hidden rounded-md border bg-popover shadow-lg">
            {results.isFetching ? (
              <p className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Recherche…
              </p>
            ) : results.isError ? (
              <p className="px-3 py-2.5 text-sm text-muted-foreground">Recherche indisponible. Placez le point sur la carte.</p>
            ) : results.data?.resultats?.length ? (
              <div className="max-h-56 overflow-y-auto">
                {results.data.resultats.map((place) => (
                  <button
                    key={`${place.lat},${place.lng},${place.label}`}
                    type="button"
                    role="option"
                    aria-selected={false}
                    className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent focus-visible:bg-accent"
                    onClick={() => choose(place)}
                  >
                    <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block font-medium">{place.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">{place.detail}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-3 py-2.5 text-sm text-muted-foreground">Aucun lieu trouvé. Placez le point sur la carte.</p>
            )}
          </div>
        )}
      </div>

      <MapCanvas
        depart={depart}
        arrivee={arrivee}
        departLabel={departLabel}
        arriveeLabel={arriveeLabel}
        onPick={pick}
        height={height}
        mapRef={mapRef}
      >
        <MapControl>
          <Button type="button" size="sm" variant="secondary" className="shadow-md" onClick={locate} disabled={locating}>
            {locating ? <Loader2 className="animate-spin" /> : <Crosshair />}
            Ma position
          </Button>
        </MapControl>
      </MapCanvas>

      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <p>
          {hasPoint(activePoint)
            ? `Point de ${active === 'depart' ? 'départ' : 'arrivée'} placé. Cliquez ailleurs pour le déplacer.`
            : `Cliquez sur la carte ou recherchez une adresse pour placer le point de ${active === 'depart' ? 'départ' : 'arrivée'}.`}
          {km !== null && ` · ${formatDistance(km)} à vol d’oiseau`}
        </p>
        {hasPoint(activePoint) && (
          <button type="button" onClick={() => onChange(active, null)} className="shrink-0 font-medium underline-offset-2 hover:text-destructive hover:underline">
            Retirer ce point
          </button>
        )}
      </div>
    </div>
  );
}
