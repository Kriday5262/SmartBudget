import { useState } from "react";
import { ChevronDown, Pencil, Plus } from "lucide-react";
import { Group, Row, Radio, TextField, FilledButton } from "@/components/MaterialList";
import { useDB, mutate } from "@/lib/store";
import {
  CURRENCIES,
  CUSTOM_CODE,
  money,
  parseCustomCurrency,
  previewCustomCurrency,
  lookupCurrency,
  type CustomCurrency,
} from "@/lib/format";
import { cn } from "@/lib/utils";

const POPULAR = ["INR", "USD", "EUR", "GBP", "AED"];

/** Save the household's currency (a built-in code, or a typed-in one). */
function saveCurrency(code: string, custom?: CustomCurrency) {
  mutate((d) => {
    d.settings.currency = code;
    if (custom) d.settings.currencyCustom = JSON.stringify(custom);
  });
}

/**
 * Currency choice for the current household: the common currencies, a "More
 * currencies" row for the rest, and "Custom currency" to type in any currency
 * (name, symbol, country, decimals, symbol side, digit grouping).
 */
export function CurrencyPicker() {
  const db = useDB();
  const code = db.settings.currency ?? "INR";
  const custom = parseCustomCurrency(db.settings.currencyCustom);
  const [showAll, setShowAll] = useState(!POPULAR.includes(code) && code !== CUSTOM_CODE);
  const [editing, setEditing] = useState(false);

  const list = CURRENCIES.filter((c) => showAll || POPULAR.includes(c.code) || c.code === code);

  return (
    <div className="space-y-4">
      <Group>
        {list.map((c, i) => (
          <Row
            key={c.code}
            leading={<SymbolBadge symbol={c.symbol} delay={i * 30} />}
            title={c.name}
            summary={`${c.code} · ${c.country}`}
            trailing={<Radio checked={code === c.code} />}
            onClick={() => saveCurrency(c.code)}
          />
        ))}
        {!showAll && (
          <Row
            icon={ChevronDown}
            title="More currencies"
            summary={`${CURRENCIES.length - list.length} more`}
            onClick={() => setShowAll(true)}
          />
        )}
        {custom && !editing && (
          <div className="flex min-h-[72px] items-center gap-4 bg-card px-5 py-3">
            <button
              type="button"
              role="radio"
              aria-checked={code === CUSTOM_CODE}
              onClick={() => saveCurrency(CUSTOM_CODE)}
              className="flex min-w-0 flex-1 items-center gap-4 text-left"
            >
              <SymbolBadge symbol={custom.symbol} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[16px] leading-snug">{custom.name}</span>
                <span className="mt-0.5 block truncate text-sm leading-snug text-muted-foreground">
                  {[custom.code, custom.country, "Custom"].filter(Boolean).join(" · ")}
                </span>
              </span>
              <Radio checked={code === CUSTOM_CODE} />
            </button>
            <button
              type="button"
              aria-label="Edit custom currency"
              onClick={() => setEditing(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        )}
        {editing ? (
          <CustomCurrencyForm
            initial={custom}
            onCancel={() => setEditing(false)}
            onSave={(c) => {
              saveCurrency(CUSTOM_CODE, c);
              setEditing(false);
            }}
          />
        ) : (
          !custom && (
            <Row
              icon={Plus}
              title="Custom currency"
              summary="Type in any currency: name, symbol, country"
              onClick={() => setEditing(true)}
            />
          )
        )}
      </Group>
      <p className="px-5 text-sm text-muted-foreground">
        Amounts look like{" "}
        <span className="num font-semibold text-foreground">{money(123456.78)}</span>. Only this
        household changes; others keep their own currency.
      </p>
    </div>
  );
}

/** The currency's symbol in a round badge, sized to fit (₹, S$, AED, FCFA). */
function SymbolBadge({ symbol, delay = 0 }: { symbol: string; delay?: number }) {
  const len = [...symbol].length;
  return (
    <span
      aria-hidden
      className={cn(
        "sb-wiz-item flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold leading-none text-primary",
        len <= 1 ? "text-lg" : len === 2 ? "text-sm" : "text-[11px] tracking-tight",
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {symbol.slice(0, 4)}
    </span>
  );
}

function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="px-1 text-sm font-medium">{label}</p>
      <div
        role="radiogroup"
        aria-label={label}
        className="grid overflow-hidden rounded-full border border-muted-foreground/40"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((o, i) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-10 px-2 text-xs font-semibold transition-colors",
              i > 0 && "border-l border-muted-foreground/40",
              value === o.value
                ? "bg-primary/20 text-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CustomCurrencyForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: CustomCurrency | null;
  onSave: (c: CustomCurrency) => void;
  onCancel: () => void;
}) {
  const [c, setC] = useState<CustomCurrency>(
    initial ?? {
      name: "",
      symbol: "",
      code: "",
      country: "",
      decimals: 2,
      position: "before",
      grouping: "international",
    },
  );
  const [error, setError] = useState("");
  const [found, setFound] = useState<string | null>(null);
  const patch = (p: Partial<CustomCurrency>) => setC((x) => ({ ...x, ...p }));

  /** Typing a real code (ETB, NGN, KES…) fills in the rest; all of it stays editable. */
  function onCode(raw: string) {
    const code = raw
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .slice(0, 6);
    const hit = code.length === 3 ? lookupCurrency(code) : null;
    if (hit) {
      setC((x) => ({ ...x, ...hit, code, position: "before" }));
      setFound(hit.name);
    } else {
      patch({ code });
      setFound(code.length === 3 ? "" : null);
    }
  }

  const preview = c.symbol.trim()
    ? previewCustomCurrency(123456.78, { ...c, symbol: c.symbol.trim() })
    : "";

  return (
    <form
      className="animate-native-slide space-y-4 bg-card px-5 py-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!c.name.trim()) return setError("Give the currency a name");
        if (!c.symbol.trim()) return setError("Add a symbol, like ₿ or Br");
        onSave({
          ...c,
          name: c.name.trim(),
          symbol: c.symbol.trim(),
          code: c.code?.trim().toUpperCase() || undefined,
          country: c.country?.trim() || undefined,
        });
      }}
    >
      <div className="space-y-1.5">
        <TextField
          label="Currency code"
          placeholder="e.g. ETB, NGN, KES"
          value={c.code ?? ""}
          autoFocus
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={6}
          onChange={(e) => onCode(e.target.value)}
        />
        <p
          className={cn("px-1 text-xs", found ? "text-primary" : "text-muted-foreground")}
          aria-live="polite"
        >
          {found
            ? `Found ${found}. Change anything below if you like.`
            : found === ""
              ? "We don't know that code; fill in the details yourself."
              : "Type the 3-letter code and the rest fills in, or fill it in yourself."}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          key={`name-${found}`}
          label="Currency name"
          placeholder="e.g. Ethiopian Birr"
          value={c.name}
          maxLength={40}
          className={found ? "sb-wiz-pop" : undefined}
          onChange={(e) => patch({ name: e.target.value })}
        />
        <TextField
          key={`symbol-${found}`}
          label="Symbol"
          placeholder="e.g. Br"
          value={c.symbol}
          maxLength={5}
          className={found ? "sb-wiz-pop" : undefined}
          onChange={(e) => patch({ symbol: e.target.value })}
        />
        <div className="sm:col-span-2">
          <TextField
            key={`country-${found}`}
            label="Country or region"
            placeholder="Optional"
            value={c.country ?? ""}
            maxLength={40}
            className={found ? "sb-wiz-pop" : undefined}
            onChange={(e) => patch({ country: e.target.value })}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Segmented
          label="Symbol goes"
          value={c.position}
          onChange={(v) => patch({ position: v })}
          options={[
            { value: "before", label: "Before" },
            { value: "after", label: "After" },
          ]}
        />
        <Segmented
          label="Decimals"
          value={c.decimals}
          onChange={(v) => patch({ decimals: v })}
          options={[
            { value: 2, label: "1.00" },
            { value: 0, label: "1" },
          ]}
        />
        <Segmented
          label="Grouping"
          value={c.grouping}
          onChange={(v) => patch({ grouping: v })}
          options={[
            { value: "international", label: "123,456" },
            { value: "indian", label: "1,23,456" },
          ]}
        />
      </div>
      <div className="rounded-2xl bg-muted/50 px-4 py-3 text-center">
        <p className="text-xs text-muted-foreground">Preview</p>
        <p key={preview} className="num sb-wiz-pop text-xl font-semibold">
          {preview || "—"}
        </p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <FilledButton type="button" variant="text" onClick={onCancel}>
          Cancel
        </FilledButton>
        <FilledButton type="submit">Use this currency</FilledButton>
      </div>
    </form>
  );
}
