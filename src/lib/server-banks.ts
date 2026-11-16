/**
 * Bank search with logos, for any bank in the world.
 *
 * Runs on the server so the browser never talks to third parties: it asks
 * Wikidata for banks and financial companies matching the typed name, then
 * downloads each one's logo (from Wikimedia Commons, or the bank website's icon
 * via DuckDuckGo when Wikidata has no logo) and returns it as a small data URL
 * that is saved with the account, so it keeps working offline.
 *
 * Server-only: import from inside server function handlers.
 */

export type BankResult = {
  id: string;
  name: string;
  description?: string;
  website?: string;
  /** data: URL of the logo, when one was found */
  logo?: string;
};

const UA = "SmartBudget (self-hosted family budgeting app)";
const WIKIDATA = "https://www.wikidata.org/w/api.php";
const MAX_LOGO_BYTES = 60_000;

/** Looks like a bank or money company… */
const FINANCIAL =
  /\b(bank|banking|financial|finance|fintech|payment|payments|credit union|building society|neobank|lender|lending|wallet|card|cooperative bank|savings|investment|brokerage|insurance|money)\b/i;
/** …but not one of the many buildings, branches and clubs named after banks. */
const NOT_A_BANK =
  /\b(building|branch|station|street|stadium|arena|center|centre|tower|skyscraper|football|club|museum|headquarters|plaza|award|cup|league|film|album|song|family name|given name)\b/i;

const cache = new Map<string, { at: number; results: BankResult[] }>();
const CACHE_MS = 24 * 60 * 60 * 1000;

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "application/json" },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`Bank search failed (${res.status})`);
  return (await res.json()) as T;
}

type SearchHit = { id: string; label?: string; description?: string };
type Claim = { mainsnak?: { datavalue?: { value?: unknown } } };
type Entity = { claims?: Record<string, Claim[]> };

function claim(e: Entity | undefined, prop: string): string | undefined {
  const v = e?.claims?.[prop]?.[0]?.mainsnak?.datavalue?.value;
  return typeof v === "string" ? v : undefined;
}

async function download(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA },
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
    });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.startsWith("image/")) return undefined;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_LOGO_BYTES) return undefined;
    return `data:${type.split(";")[0]};base64,${buf.toString("base64")}`;
  } catch {
    return undefined;
  }
}

async function logoFor(logoFile?: string, website?: string): Promise<string | undefined> {
  if (logoFile) {
    // Commons renders a small PNG of any logo (SVG included).
    const png = await download(
      `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(logoFile)}?width=96`,
    );
    if (png) return png;
  }
  if (website) {
    try {
      const host = new URL(website).hostname.replace(/^www\./, "");
      return await download(`https://icons.duckduckgo.com/ip3/${host}.ico`);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/** Banks and money companies matching a name, best first, with logos. */
export async function searchBanksServer(query: string): Promise<BankResult[]> {
  const q = query.trim().replace(/\s+/g, " ").slice(0, 60);
  if (q.length < 2) return [];
  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.results;

  const search = (text: string) =>
    getJson<{ search?: SearchHit[] }>(
      `${WIKIDATA}?action=wbsearchentities&format=json&language=en&uselang=en&type=item&limit=7&search=${encodeURIComponent(text)}`,
    )
      .then((r) => r.search ?? [])
      .catch(() => [] as SearchHit[]);

  // "Chase" alone finds people called Chase; "Chase bank" finds the bank.
  const [plain, banky] = await Promise.all([
    search(q),
    /\bbank\b/i.test(q) ? Promise.resolve([] as SearchHit[]) : search(`${q} bank`),
  ]);
  const seen = new Set<string>();
  const hits = [...plain, ...banky].filter((h) => {
    if (seen.has(h.id)) return false;
    seen.add(h.id);
    const d = h.description ?? "";
    return FINANCIAL.test(`${d} ${h.label ?? ""}`) && !NOT_A_BANK.test(d);
  });
  if (hits.length === 0) {
    cache.set(key, { at: Date.now(), results: [] });
    return [];
  }

  const ids = hits.slice(0, 10).map((h) => h.id);
  const entities = await getJson<{ entities?: Record<string, Entity> }>(
    `${WIKIDATA}?action=wbgetentities&format=json&props=claims&ids=${ids.join("|")}`,
  )
    .then((r) => r.entities ?? {})
    .catch(() => ({}) as Record<string, Entity>);

  const ranked = hits
    .slice(0, 10)
    .map((h) => {
      const e = entities[h.id];
      return {
        h,
        logoFile: claim(e, "P154"),
        website: claim(e, "P856"),
      };
    })
    // Real companies have a logo or a website; branches and subsidiaries often don't.
    .sort(
      (a, b) =>
        Number(!!b.logoFile) * 2 +
        Number(!!b.website) -
        (Number(!!a.logoFile) * 2 + Number(!!a.website)),
    )
    .slice(0, 6);

  // Names come back straight away; logos are fetched one by one with bankLogoServer.
  const results: BankResult[] = ranked.map(({ h, logoFile, website }) => {
    logoSources.set(h.id, { logoFile, website });
    return {
      id: h.id,
      name: h.label ?? q,
      description: h.description,
      website,
      logo: logoCache.get(h.id),
    };
  });
  cache.set(key, { at: Date.now(), results });
  return results;
}

/** Where each searched bank's logo lives; only these ids can be fetched (no open proxy). */
const logoSources = new Map<string, { logoFile?: string; website?: string }>();
const logoCache = new Map<string, string | undefined>();

/** The logo (data: URL) for a bank returned by a recent search, or undefined. */
export async function bankLogoServer(id: string): Promise<string | undefined> {
  if (logoCache.has(id)) return logoCache.get(id);
  const src = logoSources.get(id);
  if (!src) return undefined;
  const logo = await logoFor(src.logoFile, src.website);
  logoCache.set(id, logo);
  // Later searches hand the logo back with the name.
  for (const entry of cache.values()) {
    for (const r of entry.results) if (r.id === id) r.logo = logo;
  }
  return logo;
}
