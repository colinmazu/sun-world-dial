// Postcode lookup — the only code that talks to the network.

/** Call the postcodes.io API and return { postcode, lat, lon }. */
export async function lookupPostcode(postcode) {
  const res = await fetch(
    'https://api.postcodes.io/postcodes/' + encodeURIComponent(postcode)
  );
  if (res.status === 404) {
    throw new Error('Postcode not found');
  }
  if (!res.ok) {
    throw new Error('Lookup failed');
  }
  const json = await res.json();
  return {
    postcode: json.result.postcode,
    lat: json.result.latitude,
    lon: json.result.longitude,
  };
}

/** Find the nearest UK postcode within 2 km of a point. Returns the postcode string or null. */
export async function nearestPostcode(lat, lon) {
  try {
    const res = await fetch(
      `https://api.postcodes.io/postcodes?lon=${lon}&lat=${lat}&limit=1&radius=2000`
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.result && json.result.length > 0 ? json.result[0].postcode : null;
  } catch {
    return null;
  }
}
