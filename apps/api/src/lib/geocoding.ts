export interface GeocodedLocation {
  name: string;
  displayName: string;
  lat: number;
  lng: number;
}

export async function geocode(address: string): Promise<GeocodedLocation> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&addressdetails=1`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "HaulWise/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Geocoding request failed with status ${response.status}`);
  }

  const data = (await response.json()) as Array<{
    display_name: string;
    lat: string;
    lon: string;
    address?: {
      city?: string;
      town?: string;
      village?: string;
      state?: string;
      country?: string;
    };
  }>;

  if (!data || data.length === 0) {
    throw new Error(
      `Location not found: "${address}". Please use a city, address, or landmark.`,
    );
  }

  const result = data[0];
  const addr = result.address;
  const shortName =
    addr?.city || addr?.town || addr?.village
      ? `${addr.city ?? addr.town ?? addr.village}${addr.state ? `, ${addr.state}` : ""}`
      : result.display_name.split(",").slice(0, 2).join(",").trim();

  return {
    name: shortName,
    displayName: result.display_name,
    lat: parseFloat(result.lat),
    lng: parseFloat(result.lon),
  };
}

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const response = await fetch(url, {
      headers: { "User-Agent": "HaulWise/1.0" },
    });
    if (!response.ok) return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
    const data = (await response.json()) as {
      display_name: string;
      address?: { city?: string; town?: string; state?: string };
    };
    const addr = data.address;
    if (addr?.city || addr?.town) {
      return `${addr.city ?? addr.town}${addr.state ? `, ${addr.state}` : ""}`;
    }
    return data.display_name.split(",").slice(0, 2).join(",").trim();
  } catch {
    return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
  }
}
