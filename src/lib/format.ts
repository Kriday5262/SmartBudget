/* ---------- currency ---------- */

export type CurrencyInfo = {
  code: string;
  name: string;
  symbol: string;
  /** locale that groups digits the way people of that currency expect */
  locale: string;
  country: string;
};

export const CURRENCIES: CurrencyInfo[] = [
  { code: "INR", name: "Indian Rupee", symbol: "₹", locale: "en-IN", country: "India" },
  { code: "USD", name: "US Dollar", symbol: "$", locale: "en-US", country: "United States" },
  { code: "EUR", name: "Euro", symbol: "€", locale: "en-IE", country: "Eurozone" },
  { code: "GBP", name: "British Pound", symbol: "£", locale: "en-GB", country: "United Kingdom" },
  {
    code: "AED",
    name: "UAE Dirham",
    symbol: "AED",
    locale: "en-AE",
    country: "United Arab Emirates",
  },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", locale: "en-SG", country: "Singapore" },
  { code: "CAD", name: "Canadian Dollar", symbol: "CA$", locale: "en-CA", country: "Canada" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", locale: "en-AU", country: "Australia" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", locale: "ja-JP", country: "Japan" },
  { code: "NPR", name: "Nepalese Rupee", symbol: "Rs", locale: "en-NP", country: "Nepal" },
  { code: "LKR", name: "Sri Lankan Rupee", symbol: "Rs", locale: "en-LK", country: "Sri Lanka" },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "৳", locale: "en-BD", country: "Bangladesh" },
];

/** A currency the household typed in itself (Settings › Currency › Custom). */
export type CustomCurrency = {
  name: string;
  symbol: string;
  code?: string;
  country?: string;
  decimals: 0 | 2;
  position: "before" | "after";
  /** "indian" = 1,23,456 · "international" = 123,456 */
  grouping: "indian" | "international";
};

export const CUSTOM_CODE = "CUSTOM";

export function parseCustomCurrency(json: string | undefined): CustomCurrency | null {
  if (!json) return null;
  try {
    const c = JSON.parse(json) as Partial<CustomCurrency>;
    if (!c.name?.trim() || !c.symbol?.trim()) return null;
    return {
      name: c.name.trim(),
      symbol: c.symbol.trim(),
      code: c.code?.trim() || undefined,
      country: c.country?.trim() || undefined,
      decimals: c.decimals === 0 ? 0 : 2,
      position: c.position === "after" ? "after" : "before",
      grouping: c.grouping === "international" ? "international" : "indian",
    };
  } catch {
    return null;
  }
}

let current: CurrencyInfo = CURRENCIES[0];
let custom: CustomCurrency | null = null;
const formatters = new Map<string, Intl.NumberFormat>();

function decimalsFor(): number {
  if (custom) return custom.decimals;
  return (
    new Intl.NumberFormat(current.locale, {
      style: "currency",
      currency: current.code,
    }).resolvedOptions().maximumFractionDigits ?? 2
  );
}

function formatter(kind: "money" | "whole" | "number"): Intl.NumberFormat {
  const key = custom
    ? `custom:${current.locale}:${custom.decimals}:${kind}`
    : `${current.code}:${kind}`;
  let f = formatters.get(key);
  if (!f) {
    const decimals = kind === "whole" ? 0 : decimalsFor();
    // A typed-in currency has no ISO code, so it is drawn as a plain number + symbol.
    const asCurrency = kind !== "number" && !custom;
    f = new Intl.NumberFormat(current.locale, {
      ...(asCurrency ? { style: "currency", currency: current.code } : {}),
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    formatters.set(key, f);
  }
  return f;
}

/** "₹5" / "5 Br" for a typed-in currency. */
function withSymbol(n: number, f: Intl.NumberFormat): string {
  const c = custom!;
  const sign = n < 0 ? "-" : "";
  const num = f.format(Math.abs(n));
  const gap = c.symbol.length > 1 ? " " : "";
  return c.position === "after" ? `${sign}${num} ${c.symbol}` : `${sign}${c.symbol}${gap}${num}`;
}

/** Rupee-style digit grouping (1,23,456) is what people expect for these. */
const INDIAN_GROUPING = new Set(["INR", "NPR", "PKR", "BDT", "LKR"]);

/**
 * Everything the browser knows about an ISO currency code ("ETB" → Ethiopian
 * Birr, Ethiopia, its symbol and decimals), or null for an unknown code.
 */
export function lookupCurrency(
  input: string,
): (Omit<CustomCurrency, "position"> & { code: string }) | null {
  const code = input.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return null;
  try {
    const known =
      typeof Intl.supportedValuesOf === "function"
        ? Intl.supportedValuesOf("currency").includes(code)
        : true;
    const name = new Intl.DisplayNames(["en"], { type: "currency" }).of(code);
    if (!known || !name || name === code) return null;

    // Most codes start with their country's two-letter code (ETB → ET).
    let country: string | undefined;
    const region = code.slice(0, 2);
    if (!code.startsWith("X")) {
      const r = new Intl.DisplayNames(["en"], { type: "region" }).of(region);
      if (r && r !== region) country = r;
    }

    // Prefer a real symbol (₦, ฿, Ksh) over the bare code.
    const symbolIn = (locale: string) => {
      try {
        return (
          new Intl.NumberFormat(locale, {
            style: "currency",
            currency: code,
            currencyDisplay: "narrowSymbol",
          })
            .formatToParts(1)
            .find((p) => p.type === "currency")?.value ?? code
        );
      } catch {
        return code;
      }
    };
    const symbol = [symbolIn("en"), symbolIn(`en-${region}`)].find((x) => x !== code) ?? code;
    const decimals =
      new Intl.NumberFormat("en", { style: "currency", currency: code }).resolvedOptions()
        .maximumFractionDigits === 0
        ? 0
        : 2;
    return {
      code,
      name,
      symbol,
      country,
      decimals,
      grouping: INDIAN_GROUPING.has(code) ? "indian" : "international",
    };
  } catch {
    return null;
  }
}

/** How an amount would look in a typed-in currency, without switching to it. */
export function previewCustomCurrency(amount: number, c: CustomCurrency): string {
  const f = new Intl.NumberFormat(c.grouping === "indian" ? "en-IN" : "en-US", {
    minimumFractionDigits: c.decimals,
    maximumFractionDigits: c.decimals,
  });
  const sign = amount < 0 ? "-" : "";
  const num = f.format(Math.abs(amount));
  const gap = c.symbol.length > 1 ? " " : "";
  return c.position === "after" ? `${sign}${num} ${c.symbol}` : `${sign}${c.symbol}${gap}${num}`;
}

/** Switch the currency every amount is shown in (a household setting). */
export function setCurrency(
  code: string | undefined,
  customCurrency?: CustomCurrency | null,
): void {
  if (code === CUSTOM_CODE && customCurrency) {
    custom = customCurrency;
    current = {
      code: customCurrency.code || CUSTOM_CODE,
      name: customCurrency.name,
      symbol: customCurrency.symbol,
      locale: customCurrency.grouping === "indian" ? "en-IN" : "en-US",
      country: customCurrency.country ?? "",
    };
    return;
  }
  custom = null;
  current = CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

export function currentCurrency(): CurrencyInfo & { custom: CustomCurrency | null } {
  return { ...current, custom };
}

/** "₹", "$", "AED" … for labels like "Amount (₹)". */
export function currencySymbol(): string {
  return current.symbol;
}

/** ₹1,23,456.78 (in the household's currency) */
export function money(amount: number): string {
  return custom ? withSymbol(amount, formatter("number")) : formatter("money").format(amount);
}

/** ₹1,23,457 — whole units, for tight spaces. */
export function moneyWhole(amount: number): string {
  if (!custom) return formatter("whole").format(amount);
  return withSymbol(amount, new Intl.NumberFormat(current.locale, { maximumFractionDigits: 0 }));
}

/** 1,23,456.78 — the number alone, grouped for the household's currency. */
export function amountNumber(amount: number): string {
  return formatter("number").format(amount);
}

export function signedMoney(amount: number): string {
  return `${amount > 0 ? "+" : ""}${money(amount)}`;
}

export function monthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
}

export function todayISO(): string {
  // Local calendar date — toISOString() is UTC, which is "yesterday" before 5:30am in India.
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Date to stamp a category-to-category transfer so it lands inside the viewed
 * month: today when viewing the current month, else the month's start/end.
 */
export function categoryTransferDate(month: string): string {
  const today = todayISO();
  if (today.slice(0, 7) === month) return today;
  const [y, m] = month.split("-").map(Number);
  if (today < `${month}-01`) return `${month}-01`;
  return `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
}

export function prettyDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** "3 days ago", "in 2 hours" — in the viewer's language. */
export function timeAgo(ms: number): string {
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const diff = (ms - Date.now()) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, secs] of units) {
    if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit);
  }
  return rtf.format(0, "minute");
}
