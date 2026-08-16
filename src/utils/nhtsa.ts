const BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles';

interface NhtsaMakeResult {
  Make_ID: number;
  Make_Name: string;
}

interface NhtsaModelResult {
  Model_ID: number;
  Model_Name: string;
}

/** Free-text search across all makes, filtered client-side by prefix. */
export async function searchMakes(query: string): Promise<string[]> {
  if (query.trim().length < 2) return [];
  const res = await fetch(`${BASE}/getallmakes?format=json`);
  const json = await res.json();
  const all: NhtsaMakeResult[] = json.Results ?? [];
  const q = query.trim().toLowerCase();
  return all
    .map((m) => m.Make_Name)
    .filter((name) => name.toLowerCase().startsWith(q))
    .slice(0, 15);
}

export async function getModelsForMake(make: string, year: number): Promise<string[]> {
  if (!make) return [];
  const res = await fetch(
    `${BASE}/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${year}?format=json`
  );
  const json = await res.json();
  const results: NhtsaModelResult[] = json.Results ?? [];
  return [...new Set(results.map((m) => m.Model_Name))].sort();
}
