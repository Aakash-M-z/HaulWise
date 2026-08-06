const METERS_PER_MILE = 1609.344;

export interface RouteResult {
  distanceMeters: number;
  distanceMiles: number;
  durationSeconds: number;
  /** Array of [lng, lat] GeoJSON coordinate pairs */
  coordinates: [number, number][];
}

export interface LatLng {
  lat: number;
  lng: number;
}

/** Haversine distance in meters between two points */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Interpolate the [lng, lat] coordinate at `targetMiles` along a polyline.
 * If targetMiles exceeds the polyline length, returns the last coordinate.
 */
export function coordAtDistance(
  coords: [number, number][],
  targetMiles: number,
): [number, number] {
  if (!coords.length) return [0, 0];
  if (targetMiles <= 0) return coords[0];

  let accumulated = 0;

  for (let i = 1; i < coords.length; i++) {
    const [lng1, lat1] = coords[i - 1];
    const [lng2, lat2] = coords[i];
    const segMiles = haversineMeters(lat1, lng1, lat2, lng2) / METERS_PER_MILE;

    if (accumulated + segMiles >= targetMiles) {
      const ratio = segMiles > 0 ? (targetMiles - accumulated) / segMiles : 0;
      return [lng1 + (lng2 - lng1) * ratio, lat1 + (lat2 - lat1) * ratio];
    }
    accumulated += segMiles;
  }

  return coords[coords.length - 1];
}

/** Straight-line fallback route with a ~20% road-factor inflation */
function fallbackRoute(from: LatLng, to: LatLng): RouteResult {
  const straightMeters = haversineMeters(from.lat, from.lng, to.lat, to.lng);
  const distanceMeters = straightMeters * 1.2;
  return {
    distanceMeters,
    distanceMiles: distanceMeters / METERS_PER_MILE,
    durationSeconds: (distanceMeters / METERS_PER_MILE / 55) * 3600,
    coordinates: [
      [from.lng, from.lat],
      [to.lng, to.lat],
    ],
  };
}

/** Fetch a driving route from OSRM, falling back to haversine on error. */
export async function getRoute(from: LatLng, to: LatLng): Promise<RouteResult> {
  try {
    const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

    const response = await fetch(url, {
      headers: { "User-Agent": "HaulWise/1.0" },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) throw new Error(`OSRM status ${response.status}`);

    const data = (await response.json()) as {
      code: string;
      routes?: Array<{
        distance: number;
        duration: number;
        geometry: { coordinates: [number, number][] };
      }>;
    };

    if (data.code !== "Ok" || !data.routes?.length) {
      throw new Error("No route found");
    }

    const route = data.routes[0];
    return {
      distanceMeters: route.distance,
      distanceMiles: route.distance / METERS_PER_MILE,
      durationSeconds: route.duration,
      coordinates: route.geometry.coordinates,
    };
  } catch {
    return fallbackRoute(from, to);
  }
}
