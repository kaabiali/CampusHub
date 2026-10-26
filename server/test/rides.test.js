import { describe, it, expect } from 'vitest';
import { as, createUser } from './helpers.js';
import { Ride } from '../src/models/Ride.js';
import { Reservation } from '../src/models/Reservation.js';
import { Notification } from '../src/models/Notification.js';
import { User } from '../src/models/User.js';
import { closePastRides } from '../src/jobs/scheduler.js';

const inHours = (h) => new Date(Date.now() + h * 3600 * 1000).toISOString();

const offer = (driver, overrides = {}) =>
  as(driver)
    .post('/api/trajets')
    .send({ lieuDepart: 'La Marsa, centre', lieuArrivee: 'Campus', dateDepart: inHours(20), placesTotales: 3, prix: 3, ...overrides });

async function seatsInvariant(rideId) {
  const ride = await Ride.findById(rideId);
  const booked = await Reservation.aggregate([{ $match: { trajet: ride._id, statut: 'CONFIRMEE' } }, { $group: { _id: null, n: { $sum: '$nbPlaces' } } }]);
  expect(ride.placesDisponibles).toBe(ride.placesTotales - (booked[0]?.n ?? 0));
  return ride;
}

describe('publication et recherche', () => {
  it('refuse un départ dans le passé ou trop lointain', async () => {
    const driver = await createUser();
    expect((await offer(driver, { dateDepart: inHours(-1) })).body.error.champs.dateDepart).toBeDefined();
    expect((await offer(driver, { dateDepart: inHours(24 * 90) })).status).toBe(400);
    const ok = await offer(driver);
    expect(ok.status).toBe(201);
    expect(ok.body.trajet.placesDisponibles).toBe(3);
  });

  it('cherche sans accents et filtre par jour', async () => {
    const driver = await createUser();
    await offer(driver, { lieuDepart: 'Sidi Bou Saïd', dateDepart: inHours(30) });
    await offer(driver, { lieuDepart: 'Ariana, Menzah 6' });
    const user = await createUser();
    const res = await as(user).get('/api/trajets?depart=sidi bou said');
    expect(res.body.trajets.map((t) => t.lieuDepart)).toEqual(['Sidi Bou Saïd']);
    expect(res.body.trajets[0].conducteur.email).toBeUndefined();
    const tomorrowPlus = new Date(Date.now() + 30 * 3600 * 1000).toLocaleDateString('en-CA', { timeZone: 'Africa/Tunis' });
    const byDay = await as(user).get(`/api/trajets?date=${tomorrowPlus}`);
    expect(byDay.body.trajets.some((t) => t.lieuDepart === 'Sidi Bou Saïd')).toBe(true);
  });
});

describe('réservation', () => {
  it('ne surréserve jamais : 10 demandes simultanées pour 3 places', async () => {
    const driver = await createUser();
    const { _id } = (await offer(driver)).body.trajet;
    const passengers = await Promise.all(Array.from({ length: 10 }, () => createUser()));
    const results = await Promise.all(passengers.map((p) => as(p).post(`/api/trajets/${_id}/reservations`).send({})));
    const statuses = results.map((r) => r.status).sort();
    expect(statuses.filter((s) => s === 201)).toHaveLength(3);
    expect(statuses.filter((s) => s === 409)).toHaveLength(7);
    const ride = await seatsInvariant(_id);
    expect(ride.placesDisponibles).toBe(0);
    expect(ride.statut).toBe('COMPLET');
  });

  it('un double clic ne crée qu’une réservation', async () => {
    const driver = await createUser();
    const passenger = await createUser();
    const { _id } = (await offer(driver)).body.trajet;
    const [a, b] = await Promise.all([as(passenger).post(`/api/trajets/${_id}/reservations`).send({}), as(passenger).post(`/api/trajets/${_id}/reservations`).send({})]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    await seatsInvariant(_id);
    expect((await Ride.findById(_id)).placesDisponibles).toBe(2);
  });

  it('explique pourquoi une réservation est impossible', async () => {
    const driver = await createUser();
    const passenger = await createUser();
    const { _id } = (await offer(driver, { placesTotales: 1 })).body.trajet;
    expect((await as(driver).post(`/api/trajets/${_id}/reservations`).send({})).body.error.code).toBe('PROPRE_TRAJET');
    expect((await as(passenger).post(`/api/trajets/${_id}/reservations`).send({ nbPlaces: 2 })).body.error.code).toBe('PLACES_INSUFFISANTES');
    await Ride.updateOne({ _id }, { dateDepart: new Date(Date.now() - 60_000) });
    expect((await as(passenger).post(`/api/trajets/${_id}/reservations`).send({})).body.error.code).toBe('TRAJET_PASSE');
  });

  it('prévient le conducteur et rend la place à l’annulation', async () => {
    const driver = await createUser();
    const passenger = await createUser({ prenom: 'Rania', nom: 'Jaziri' });
    const { _id } = (await offer(driver, { placesTotales: 1 })).body.trajet;
    const { reservation } = (await as(passenger).post(`/api/trajets/${_id}/reservations`).send({})).body;
    expect((await Ride.findById(_id)).statut).toBe('COMPLET');
    const notif = await Notification.findOne({ utilisateur: driver._id });
    expect(notif.contenu).toMatch(/Rania Jaziri a réservé une place/);

    expect((await as(driver).delete(`/api/reservations/${reservation._id}`)).status).toBe(404);
    expect((await as(passenger).delete(`/api/reservations/${reservation._id}`)).status).toBe(200);
    const ride = await seatsInvariant(_id);
    expect(ride.statut).toBe('OUVERT');
    expect((await as(passenger).post(`/api/trajets/${_id}/reservations`).send({})).status).toBe(201);
  });
});

describe('gestion par le conducteur', () => {
  it('ne peut pas réduire les places sous le nombre réservé', async () => {
    const driver = await createUser();
    const { _id } = (await offer(driver, { placesTotales: 3 })).body.trajet;
    await as(await createUser()).post(`/api/trajets/${_id}/reservations`).send({ nbPlaces: 2 });
    expect((await as(driver).patch(`/api/trajets/${_id}`).send({ placesTotales: 1 })).body.error.champs.placesTotales).toMatch(/2 places/);
    const ok = await as(driver).patch(`/api/trajets/${_id}`).send({ placesTotales: 2 });
    expect(ok.body.trajet).toMatchObject({ placesTotales: 2, placesDisponibles: 0, statut: 'COMPLET' });
    expect((await as(await createUser()).patch(`/api/trajets/${_id}`).send({ prix: 1 })).status).toBe(403);
  });

  it('annule le trajet et prévient chaque passager', async () => {
    const driver = await createUser();
    const [p1, p2] = [await createUser(), await createUser()];
    const { _id } = (await offer(driver)).body.trajet;
    await as(p1).post(`/api/trajets/${_id}/reservations`).send({});
    await as(p2).post(`/api/trajets/${_id}/reservations`).send({});
    expect((await as(driver).post(`/api/trajets/${_id}/annuler`)).body.trajet.statut).toBe('ANNULE');
    expect(await Notification.countDocuments({ utilisateur: { $in: [p1._id, p2._id] }, contenu: /annulé par le conducteur/ })).toBe(2);
    expect((await as(await createUser()).post(`/api/trajets/${_id}/reservations`).send({})).body.error.code).toBe('TRAJET_ANNULE');
  });
});

describe('avis', () => {
  it('ouvre la notation après le départ, une fois, pendant 7 jours', async () => {
    const driver = await createUser();
    const passenger = await createUser();
    const { _id } = (await offer(driver)).body.trajet;
    const { reservation } = (await as(passenger).post(`/api/trajets/${_id}/reservations`).send({})).body;

    expect((await as(passenger).post(`/api/reservations/${reservation._id}/avis`).send({ note: 5 })).body.error.code).toBe('AVIS_TROP_TOT');

    await Ride.updateOne({ _id }, { dateDepart: new Date(Date.now() - 3600 * 1000) });
    expect((await as(passenger).post(`/api/reservations/${reservation._id}/avis`).send({ note: 4, commentaire: 'Ponctuel' })).status).toBe(201);
    expect((await as(passenger).post(`/api/reservations/${reservation._id}/avis`).send({ note: 1 })).body.error.code).toBe('AVIS_DEJA_DONNE');
    expect(await User.findById(driver._id).lean()).toMatchObject({ noteMoyenne: 4, nbAvis: 1 });

    const late = (await offer(driver)).body.trajet;
    const lateRes = (await as(passenger).post(`/api/trajets/${late._id}/reservations`).send({})).body.reservation;
    await Ride.updateOne({ _id: late._id }, { dateDepart: new Date(Date.now() - 8 * 24 * 3600 * 1000) });
    expect((await as(passenger).post(`/api/reservations/${lateRes._id}/avis`).send({ note: 5 })).body.error.code).toBe('AVIS_EXPIRE');
  });
});

describe('tâche planifiée', () => {
  it('clôt les trajets partis depuis plus de 3 heures, une seule fois', async () => {
    const driver = await createUser();
    const { _id } = (await offer(driver)).body.trajet;
    await Ride.updateOne({ _id }, { dateDepart: new Date(Date.now() - 4 * 3600 * 1000) });
    expect(await closePastRides()).toBe(1);
    expect(await closePastRides()).toBe(0);
    expect((await Ride.findById(_id)).statut).toBe('TERMINE');
  });
});
