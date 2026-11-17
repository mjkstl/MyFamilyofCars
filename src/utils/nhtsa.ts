const BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles';

interface NhtsaMakeResult {
  Make_ID: number;
  Make_Name: string;
}

interface NhtsaModelResult {
  Model_ID: number;
  Model_Name: string;
}

// The full make list is ~1MB and never changes during a session, so it
// is fetched once and reused. Before this, every keystroke in the Make
// field re-downloaded the whole list.
let allMakesCache: string[] | null = null;
let allMakesRequest: Promise<string[]> | null = null;

async function loadAllMakes(): Promise<string[]> {
  if (allMakesCache) return allMakesCache;
  if (!allMakesRequest) {
    allMakesRequest = (async () => {
      const res = await fetch(`${BASE}/getallmakes?format=json`);
      if (!res.ok) throw new Error(`NHTSA makes lookup failed (${res.status}).`);
      const json = await res.json();
      const all: NhtsaMakeResult[] = json.Results ?? [];
      allMakesCache = all.map((m) => m.Make_Name);
      return allMakesCache;
    })().finally(() => {
      allMakesRequest = null;
    });
  }
  return allMakesRequest;
}

/**
 * Free-text search across all makes, filtered client-side by prefix.
 * Suggestions are a convenience, never a requirement: if the lookup
 * fails (offline, NHTSA down) this returns an empty list so the person
 * can simply keep typing the make themselves.
 */
export async function searchMakes(query: string): Promise<string[]> {
  if (query.trim().length < 2) return [];
  try {
    const all = await loadAllMakes();
    const q = query.trim().toLowerCase();
    return all.filter((name) => name.toLowerCase().startsWith(q)).slice(0, 8);
  } catch {
    return [];
  }
}

/** Same contract as searchMakes: an empty list on any failure. */
export async function getModelsForMake(make: string, year: number): Promise<string[]> {
  if (!make) return [];
  try {
    const res = await fetch(
      `${BASE}/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${year}?format=json`
    );
    if (!res.ok) return [];
    const json = await res.json();
    const results: NhtsaModelResult[] = json.Results ?? [];
    return [...new Set(results.map((m) => m.Model_Name))].sort();
  } catch {
    return [];
  }
}
