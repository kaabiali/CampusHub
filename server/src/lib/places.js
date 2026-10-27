// Approximate coordinates for the demo commute landmarks. Shared by the seed and the
// backfill script so rides created before the map existed can still be displayed.
export const DEMO_PLACES = {
  'La Marsa, Corniche': { lat: 36.8864, lng: 10.331 },
  'La Marsa, centre': { lat: 36.8783, lng: 10.3247 },
  'La Marsa, Plage': { lat: 36.889, lng: 10.329 },
  'Sidi Bou Saïd, gare TGM': { lat: 36.8707, lng: 10.3414 },
  'Ariana, Menzah 6': { lat: 36.8579, lng: 10.268 },
  'Lac 2': { lat: 36.834, lng: 10.245 },
  'Le Bardo': { lat: 36.809, lng: 10.141 },
  Campus: { lat: 36.8395, lng: 10.1434 },
};

export const coordsOf = (place) => DEMO_PLACES[place] || null;
