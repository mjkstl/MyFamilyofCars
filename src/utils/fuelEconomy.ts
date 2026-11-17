/**
 * Year → Make → Model → Trim menus from FuelEconomy.gov (US EPA / DOE).
 *
 * Why this source: free, public-domain US government data, no API key,
 * and — unlike NHTSA's ~11,000-name make list — it only lists real
 * passenger-car brands, filtered by model year. Coverage starts at
 * model year 1984 (EPA_FIRST_YEAR); older cars fall back to a curated
 * list (src/data/classicMakes.ts) and free typing.
 *
 * Its "trims" are EPA vehicle options such as "Auto 4-spd, 6 cyl, 3.8 L"
 * (engine + transmission), not marketing names like "EX-L". That was a
 * deliberate choice (2026-11-17): free and reliable now; a paid trim
 * database can replace this later.
 *
 * Same contract as nhtsa.ts: every function returns an empty list on any
 * failure (offline, service down, browser CORS block on the web build),
 * so the form always falls back to typing and never blocks a save.
 */
const BASE = 'https://www.fueleconomy.gov/ws/rest/vehicle/menu';

export const EPA_FIRST_YEAR = 1984;

interface MenuItem {
  text?: unknown;
  value?: unknown;
}

const cache = new Map<string, Promise<string[]>>();

/**
 * The service answers JSON when asked (Accept header) but falls back to
 * XML, and in JSON a one-item menu comes back as an object instead of a
 * one-element array. Handle all three shapes.
 */
export function parseMenu(body: string): string[] {
  const trimmed = body.trim();
  if (!trimmed) return [];
  let texts: string[] = [];
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const json: unknown = JSON.parse(trimmed);
    const raw = (json as { menuItem?: MenuItem | MenuItem[] } | null)?.menuItem;
    const items = Array.isArray(raw) ? raw : raw ? [raw] : [];
    texts = items.map((item) => (typeof item.text === 'string' ? item.text : String(item.text ?? '')));
  } else {
    texts = [...trimmed.matchAll(/<text>([\s\S]*?)<\/text>/g)].map((m) => decodeXml(m[1]));
  }
  return [...new Set(texts.map((t) => t.trim()).filter(Boolean))];
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function load(path: string): Promise<string[]> {
  const url = `${BASE}/${path}`;
  const cached = cache.get(url);
  if (cached) return cached;
  const request = (async () => {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) return [];
      return parseMenu(await res.text());
    } catch {
      return [];
    }
  })();
  cache.set(url, request);
  // Do not keep failures cached: a later tap (e.g. back online) retries.
  void request.then((list) => {
    if (list.length === 0) cache.delete(url);
  });
  return request;
}

function covered(year: number): boolean {
  return Number.isInteger(year) && year >= EPA_FIRST_YEAR;
}

/** Car brands sold in the US in that model year, A–Z. */
export async function getEpaMakes(year: number): Promise<string[]> {
  if (!covered(year)) return [];
  const list = await load(`make?year=${year}`);
  return [...list].sort((a, b) => a.localeCompare(b));
}

/** Models for a year + make, A–Z. Empty if the make is not an EPA name. */
export async function getEpaModels(year: number, make: string): Promise<string[]> {
  if (!covered(year) || !make.trim()) return [];
  const list = await load(`model?year=${year}&make=${encodeURIComponent(make.trim())}`);
  return [...list].sort((a, b) => a.localeCompare(b));
}

/**
 * Engine/transmission options for a year + make + model, in EPA's order.
 * Empty unless make and model exactly match EPA's names (which they do
 * when they were picked from the lists above).
 */
export async function getEpaTrims(year: number, make: string, model: string): Promise<string[]> {
  if (!covered(year) || !make.trim() || !model.trim()) return [];
  return load(
    `options?year=${year}&make=${encodeURIComponent(make.trim())}&model=${encodeURIComponent(model.trim())}`
  );
}

/** Test-only: forget cached responses. */
export function __clearFuelEconomyCache() {
  cache.clear();
}
