/** Major towns used as anchors for state/region weather (approximate coordinates). */

export type MyanmarPlace = {
  id: string;
  label: string;
  /** State / region name for display */
  region: string;
  latitude: number;
  longitude: number;
};

export const MYANMAR_PLACES: MyanmarPlace[] = [
  { id: "yangon", label: "Yangon", region: "Yangon Region", latitude: 16.8409, longitude: 96.1735 },
  { id: "mandalay", label: "Mandalay", region: "Mandalay Region", latitude: 21.9588, longitude: 96.0891 },
  { id: "naypyitaw", label: "Nay Pyi Taw", region: "Nay Pyi Taw Union Territory", latitude: 19.7633, longitude: 96.0785 },
  { id: "bago", label: "Bago", region: "Bago Region", latitude: 17.335, longitude: 96.4984 },
  { id: "pathein", label: "Pathein", region: "Ayeyarwady Region", latitude: 16.7745, longitude: 94.7381 },
  { id: "mawlamyine", label: "Mawlamyine", region: "Mon State", latitude: 16.4905, longitude: 97.6282 },
  { id: "taunggyi", label: "Taunggyi", region: "Shan State (South)", latitude: 20.7833, longitude: 97.0333 },
  { id: "monywa", label: "Monywa", region: "Sagaing Region", latitude: 22.1083, longitude: 95.1358 },
  { id: "meiktila", label: "Meiktila", region: "Mandalay Region", latitude: 20.8786, longitude: 95.8584 },
  { id: "sittwe", label: "Sittwe", region: "Rakhine State", latitude: 20.1392, longitude: 92.8867 },
  { id: "dawei", label: "Dawei", region: "Tanintharyi Region", latitude: 14.0823, longitude: 98.1915 },
  { id: "hpa-an", label: "Hpa-An", region: "Kayin State", latitude: 16.8905, longitude: 97.6337 },
  { id: "lashio", label: "Lashio", region: "Shan State (North)", latitude: 22.93, longitude: 97.75 },
  { id: "myitkyina", label: "Myitkyina", region: "Kachin State", latitude: 25.3833, longitude: 97.4 },
  { id: "magway", label: "Magway", region: "Magway Region", latitude: 20.1496, longitude: 94.9325 },
  { id: "pyay", label: "Pyay", region: "Bago Region", latitude: 18.8167, longitude: 95.2167 },
  { id: "hakha", label: "Hakha", region: "Chin State", latitude: 22.65, longitude: 93.6167 },
  { id: "loikaw", label: "Loikaw", region: "Kayah State", latitude: 19.674, longitude: 97.2098 },
];

function toRad(d: number): number {
  return (d * Math.PI) / 180;
}

/** Great-circle distance in km (WGS84 sphere). */
export function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function findNearestPlace(lat: number, lon: number): MyanmarPlace {
  let best = MYANMAR_PLACES[0];
  let bestD = Infinity;
  for (const p of MYANMAR_PLACES) {
    const d = distanceKm(lat, lon, p.latitude, p.longitude);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}
