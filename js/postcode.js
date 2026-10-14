// Postcode lookup: the only code that talks to the network.

/** Fetch lat/lon for a UK postcode from postcodes.io. */
export async function lookupPostcode(postcode) {
  const res = await fetch('https://api.postcodes.io/postcodes/' + encodeURIComponent(postcode));
  if (res.status === 404) throw new Error('Postcode not found');
  if (!res.ok) throw new Error('Lookup failed');
  const json = await res.json();
  return {
    postcode: json.result.postcode,
    lat: json.result.latitude,
    lon: json.result.longitude,
  };
}
