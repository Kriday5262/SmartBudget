import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, Check, Pencil, Inbox, CalendarDays } from "lucide-react";
import { addDays, format, isSameDay } from "date-fns";
import { BankMark } from "@/components/BankMark";
import { CardBrandMark } from "@/components/CardBrandMark";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { useDB, ACCOUNT_TYPES, accountBalance, type DB } from "@/lib/store";
import { money } from "@/lib/format";
import { CategoryGlyph, categoryIconKey } from "@/lib/category-icons";
import { cn } from "@/lib/utils";

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SearchInput({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        className="h-10 rounded-xl pl-9"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function useMobileViewportStyle(open: boolean) {
  const [style, setStyle] = useState<{ height: string; top: string }>();

  useEffect(() => {
    if (!open || typeof window === "undefined") return;

    const viewport = window.visualViewport;
    const update = () => {
      if (window.innerWidth >= 640) {
        setStyle(undefined);
        return;
      }

      setStyle({
        height: `${Math.round(viewport?.height ?? window.innerHeight)}px`,
        top: `${Math.round(viewport?.offsetTop ?? 0)}px`,
      });
    };

    update();
    window.addEventListener("resize", update);
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);

    return () => {
      window.removeEventListener("resize", update);
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
    };
  }, [open]);

  return style;
}

export function AccountPicker({
  value,
  onChange,
  label,
  excludeId,
}: {
  value: string;
  onChange: (id: string) => void;
  label: string;
  excludeId?: string;
}) {
  const db = useDB();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const mobileViewportStyle = useMobileViewportStyle(open);

  const selected = db.accounts.find((a) => a.id === value);
  const q = query.trim().toLowerCase();
  const match = (a: { name: string; bank?: string }) =>
    !q || a.name.toLowerCase().includes(q) || (a.bank ?? "").toLowerCase().includes(q);
  const anyResults = db.accounts.some((a) => !a.closed && a.id !== excludeId && match(a));

  return (
    <>
      <Field label={label}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="tap flex h-10 w-full items-center gap-2 rounded-xl border bg-card px-3 text-sm no-select"
        >
          {selected &&
            (selected.type === "credit" && selected.brand ? (
              <CardBrandMark brand={selected.brand} className="h-5 w-8 shrink-0" />
            ) : (
              <BankMark bank={selected.bank} className="h-5 w-5 shrink-0" />
            ))}
          <span
            className={cn(
              "flex-1 text-left",
              selected ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {selected?.name ?? "Select"}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </Field>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setQuery("");
        }}
      >
        <DialogContent
          style={mobileViewportStyle}
          className={cn(
            "max-h-[70vh] overflow-y-auto rounded-3xl no-select sm:max-w-lg",
            "max-sm:top-0 max-sm:bottom-auto max-sm:grid-rows-[auto_minmax(0,1fr)] max-sm:h-[100dvh] max-sm:max-h-none max-sm:w-full max-sm:max-w-full max-sm:translate-y-0",
            "max-sm:rounded-b-none max-sm:rounded-t-[32px] max-sm:pb-[calc(1.5rem+env(safe-area-inset-bottom))]",
          )}
        >
          <DialogHeader>
            <DialogTitle className="text-base">{label}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
            <SearchInput placeholder="Search accounts" value={query} onChange={setQuery} />
            {ACCOUNT_TYPES.map((t) => {
              const accounts = db.accounts
                .filter((a) => a.type === t.id && !a.closed && a.id !== excludeId && match(a))
                .sort((a, b) => a.sortOrder - b.sortOrder);
              if (!accounts.length) return null;
              return (
                <div key={t.id}>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    {t.plural}
                  </p>
                  <div className="space-y-1">
                    {accounts.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          onChange(a.id);
                          setOpen(false);
                        }}
                        className={cn(
                          "tap flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm no-select",
                          a.id === value ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                        )}
                      >
                        {a.type === "credit" && a.brand ? (
                          <CardBrandMark brand={a.brand} className="h-5 w-8 shrink-0" />
                        ) : (
                          <BankMark bank={a.bank} className="h-5 w-5 shrink-0" />
                        )}
                        <span className="flex-1 truncate">{a.name}</span>
                        <span
                          className={cn(
                            "num shrink-0 text-xs tabular-nums",
                            a.id === value ? "text-primary-foreground/70" : "text-muted-foreground",
                          )}
                        >
                          {money(accountBalance(db, a.id).total)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {!anyResults && (
              <p className="py-6 text-center text-xs text-muted-foreground">No accounts found</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CategoryPicker({
  value,
  onChange,
  placeholder = "Optional",
  excludeId,
  allowReadyToAssign,
}: {
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  excludeId?: string | string[];
  /** show "Ready to Assign" (empty value) as a first-class choice, e.g. for income */
  allowReadyToAssign?: boolean;
}) {
  const excludeSet = new Set(Array.isArray(excludeId) ? excludeId : excludeId ? [excludeId] : []);
  const db = useDB();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const mobileViewportStyle = useMobileViewportStyle(open);

  const selected = db.categories.find((c) => c.id === value);
  const readySelected = allowReadyToAssign && !value;
  const q = query.trim().toLowerCase();
  const groups = [...db.categoryGroups].sort((a, b) => a.sortOrder - b.sortOrder);
  const showReady =
    !!allowReadyToAssign && (!q || "ready to assign".includes(q) || "unassigned".includes(q));
  const anyResults =
    showReady ||
    groups.some((g) =>
      db.categories.some(
        (c) =>
          c.groupId === g.id &&
          !excludeSet.has(c.id) &&
          !c.hidden &&
          (!q || c.name.toLowerCase().includes(q) || g.name.toLowerCase().includes(q)),
      ),
    );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tap flex h-10 w-full items-center gap-2 rounded-xl border bg-card px-3 text-sm no-select"
      >
        <span
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1.5 text-left",
            selected || readySelected ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {selected && <CategoryGlyph icon={categoryIconKey(selected)} className="h-4 w-4" />}
          {!selected && readySelected && <Inbox className="h-4 w-4 shrink-0" />}
          <span className="truncate">
            {selected
              ? `${db.categoryGroups.find((g) => g.id === selected.groupId)?.name ?? ""} › ${selected.name}`
              : readySelected
                ? "Ready to Assign"
                : placeholder}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setQuery("");
        }}
      >
        <DialogContent
          style={mobileViewportStyle}
          className={cn(
            "max-h-[70vh] overflow-y-auto rounded-3xl no-select sm:max-w-lg",
            "max-sm:top-0 max-sm:bottom-auto max-sm:grid-rows-[auto_minmax(0,1fr)] max-sm:h-[100dvh] max-sm:max-h-none max-sm:w-full max-sm:max-w-full max-sm:translate-y-0",
            "max-sm:rounded-b-none max-sm:rounded-t-[32px] max-sm:pb-[calc(1.5rem+env(safe-area-inset-bottom))]",
          )}
        >
          <DialogHeader>
            <DialogTitle className="text-base">Category</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
            <SearchInput placeholder="Search categories" value={query} onChange={setQuery} />
            {showReady && (
              <div>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Assignment
                </p>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      onChange("");
                      setOpen(false);
                    }}
                    className={cn(
                      "tap flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm no-select",
                      readySelected ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                    )}
                  >
                    <Inbox className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">Ready to Assign</span>
                  </button>
                </div>
              </div>
            )}
            {groups.map((g) => {
              const cats = db.categories
                .filter(
                  (c) =>
                    c.groupId === g.id &&
                    !excludeSet.has(c.id) &&
                    !c.hidden &&
                    (!q || c.name.toLowerCase().includes(q) || g.name.toLowerCase().includes(q)),
                )
                .sort((a, b) => a.sortOrder - b.sortOrder);
              if (!cats.length) return null;
              return (
                <div key={g.id}>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    {g.name}
                  </p>
                  <div className="space-y-1">
                    {cats.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          onChange(c.id);
                          setOpen(false);
                        }}
                        className={cn(
                          "tap flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm no-select",
                          c.id === value ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                        )}
                      >
                        <CategoryGlyph icon={categoryIconKey(c)} className="h-4 w-4" />
                        <span className="flex-1 truncate">{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {!anyResults && (
              <p className="py-6 text-center text-xs text-muted-foreground">No categories found</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export type PersonOption = {
  key: string;
  name: string;
  upi?: string;
  kind: "Payee" | "Account" | "Category";
};

export function personOptions(
  db: DB,
  filter?: "all" | "accounts" | "accountsWithUpi",
): PersonOption[] {
  if (filter === "accounts") {
    return db.accounts
      .filter((a) => !a.closed)
      .map((a) => ({
        key: `account:${a.id}`,
        name: a.name,
        upi: a.upiVpa,
        kind: "Account" as const,
      }));
  }
  if (filter === "accountsWithUpi") {
    return db.accounts
      .filter((a) => a.upiVpa?.trim())
      .map((a) => ({
        key: `account:${a.id}`,
        name: a.name,
        upi: a.upiVpa,
        kind: "Account" as const,
      }));
  }
  return [
    ...db.payees.map((p) => ({
      key: `payee:${p.id}`,
      name: p.name,
      upi: p.upiVpa,
      kind: "Payee" as const,
    })),
    ...db.accounts.map((a) => ({
      key: `account:${a.id}`,
      name: a.name,
      upi: a.upiVpa,
      kind: "Account" as const,
    })),
    ...db.categories
      .filter((c) => !c.hidden)
      .map((c) => ({
        key: `category:${c.id}`,
        name: c.name,
        upi: c.upiVpa,
        kind: "Category" as const,
      })),
  ];
}

export function PersonPicker({
  value,
  onChange,
  placeholder = "Choose person",
  excludeKeys,
  filter,
}: {
  value: string;
  onChange: (sel: PersonOption) => void;
  placeholder?: string;
  excludeKeys?: string[];
  filter?: "all" | "accounts" | "accountsWithUpi";
}) {
  const db = useDB();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const mobileViewportStyle = useMobileViewportStyle(open);

  const excluded = new Set(excludeKeys);
  const options: PersonOption[] = personOptions(db, filter);
  // Still show an earlier choice that this filter no longer offers (e.g. an old split's payee).
  const selected =
    options.find((o) => o.key === value) ??
    (value ? personOptions(db, "all").find((o) => o.key === value) : undefined);
  const q = query.trim().toLowerCase();
  const list = options.filter(
    (o) =>
      !excluded.has(o.key) &&
      (!q || o.name.toLowerCase().includes(q) || (o.upi ?? "").toLowerCase().includes(q)),
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tap flex h-10 w-full items-center gap-2 rounded-xl border bg-card px-3 text-sm no-select"
      >
        <span
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1.5 text-left",
            selected ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <span className="truncate">{selected?.name ?? placeholder}</span>
        </span>
        {selected?.upi && (
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
            {selected.upi}
          </span>
        )}
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setQuery("");
        }}
      >
        <DialogContent
          style={mobileViewportStyle}
          className={cn(
            "max-h-[70vh] overflow-y-auto rounded-3xl no-select sm:max-w-lg",
            "max-sm:top-0 max-sm:bottom-auto max-sm:grid-rows-[auto_minmax(0,1fr)] max-sm:h-[100dvh] max-sm:max-h-none max-sm:w-full max-sm:max-w-full max-sm:translate-y-0",
            "max-sm:rounded-b-none max-sm:rounded-t-[32px] max-sm:pb-[calc(1.5rem+env(safe-area-inset-bottom))]",
          )}
        >
          <DialogHeader>
            <DialogTitle className="text-base">Person</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
            <SearchInput
              placeholder="Search payees, accounts, categories"
              value={query}
              onChange={setQuery}
            />
            <div className="space-y-1">
              {list.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => {
                    onChange(o);
                    setOpen(false);
                  }}
                  className={cn(
                    "tap flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm no-select",
                    o.key === value ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      o.key === value
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {o.name.trim().charAt(0).toUpperCase() || "?"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{o.name}</span>
                    <span
                      className={cn(
                        "block text-[10px] font-bold uppercase tracking-wide",
                        o.key === value ? "text-primary-foreground/70" : "text-muted-foreground",
                      )}
                    >
                      {o.kind}
                    </span>
                  </span>
                  {o.upi && (
                    <span
                      className={cn(
                        "shrink-0 font-mono text-[10px]",
                        o.key === value ? "text-primary-foreground/70" : "text-muted-foreground",
                      )}
                    >
                      {o.upi}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {!list.length && (
              <p className="py-6 text-center text-xs text-muted-foreground">No matches found</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function UpiPicker({
  value,
  onChange,
  source = "all",
  placeholder = "None — pick or type a UPI id",
}: {
  value: string;
  onChange: (v: string) => void;
  source?: "all" | "payees" | "accounts";
  placeholder?: string;
}) {
  const db = useDB();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [custom, setCustom] = useState(false);

  const saved = (
    source === "payees"
      ? db.payees
          .filter((p) => p.upiVpa?.trim())
          .map((p) => ({ name: p.name, vpa: p.upiVpa!.trim(), kind: "Payee" }))
      : source === "accounts"
        ? db.accounts
            .filter((a) => a.upiVpa?.trim())
            .map((a) => ({ name: a.name, vpa: a.upiVpa!.trim(), kind: "Account" }))
        : [
            ...db.payees
              .filter((p) => p.upiVpa?.trim())
              .map((p) => ({ name: p.name, vpa: p.upiVpa!.trim(), kind: "Payee" })),
            ...db.accounts
              .filter((a) => a.upiVpa?.trim())
              .map((a) => ({ name: a.name, vpa: a.upiVpa!.trim(), kind: "Account" })),
            ...db.categories
              .filter((c) => c.upiVpa?.trim())
              .map((c) => ({ name: c.name, vpa: c.upiVpa!.trim(), kind: "Category" })),
          ]
  ).filter((p, i, all) => all.findIndex((x) => x.vpa.toLowerCase() === p.vpa.toLowerCase()) === i);
  const q = query.trim().toLowerCase();
  const filtered = saved.filter(
    (p) => !q || p.vpa.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
  );

  const showCustom = custom || (value && !saved.some((p) => p.vpa === value));

  return (
    <Popover open={open} onOpenChange={(o) => setOpen(o)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "tap flex h-10 w-full items-center gap-2 rounded-xl border bg-card px-3 text-sm no-select",
            value ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <span className={cn("min-w-0 flex-1 truncate text-left", value && "font-mono text-xs")}>
            {value || placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(24rem,calc(100vw-2rem)] rounded-2xl p-0">
        <Command>
          <CommandInput placeholder="Search UPI ids…" value={query} onValueChange={setQuery} />
          <CommandList>
            {!showCustom && <CommandEmpty>No UPI ids found</CommandEmpty>}
            {!showCustom && (
              <CommandGroup>
                {filtered.map((p) => (
                  <CommandItem
                    key={p.vpa}
                    value={`${p.name} ${p.vpa}`}
                    onSelect={() => {
                      onChange(p.vpa);
                      setOpen(false);
                      setCustom(false);
                    }}
                    className="flex items-center gap-2.5"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {p.name}
                        <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          {p.kind}
                        </span>
                      </span>
                      <span className="block truncate font-mono text-[11px] text-muted-foreground">
                        {p.vpa}
                      </span>
                    </span>
                    {value === p.vpa && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {!showCustom && (
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setCustom(true);
                    setQuery("");
                  }}
                  className="gap-2 text-muted-foreground"
                >
                  <Pencil className="h-4 w-4" />
                  <span className="text-sm font-medium">Type your own…</span>
                </CommandItem>
                {value && (
                  <CommandItem
                    onSelect={() => {
                      onChange("");
                      setOpen(false);
                    }}
                    className="gap-2 text-destructive"
                  >
                    <span className="text-sm font-medium">Clear UPI id</span>
                  </CommandItem>
                )}
              </CommandGroup>
            )}
            {showCustom && (
              <div className="border-t p-2">
                <Input
                  autoFocus
                  className="h-9 font-mono text-sm"
                  placeholder="e.g. name@bank"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                />
                <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
                  {value ? "Done — close the dropdown" : "Start typing to enter a custom UPI id"}
                </p>
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** Generic searchable dropdown for small value lists (Bank, Type, Brand, …). */
export function SearchSelect({
  value,
  onChange,
  placeholder = "Choose…",
  options,
  title = "Choose",
}: {
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  options: { value: string; label: string }[];
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const mobileViewportStyle = useMobileViewportStyle(open);
  const q = query.trim().toLowerCase();
  const list = options.filter(
    (o) => !q || o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
  );
  const selected = options.find((o) => o.value === value)?.label;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "tap flex h-10 w-full items-center gap-2 rounded-xl border bg-card px-3 text-left text-sm no-select",
          value ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <span className="min-w-0 flex-1 truncate">{selected ?? placeholder}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      <Dialog open={open} onOpenChange={(o) => setOpen(o)}>
        <DialogContent
          style={mobileViewportStyle}
          className={cn(
            "max-h-[70vh] overflow-y-auto rounded-3xl no-select sm:max-w-lg",
            "max-sm:top-0 max-sm:bottom-auto max-sm:grid-rows-[auto_minmax(0,1fr)] max-sm:h-[100dvh] max-sm:max-h-none max-sm:w-full max-sm:max-w-full max-sm:translate-y-0",
            "max-sm:rounded-b-none max-sm:rounded-t-[32px] max-sm:pb-[calc(1.5rem+env(safe-area-inset-bottom))]",
          )}
        >
          <DialogHeader>
            <DialogTitle className="text-base">{title}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
            <SearchInput placeholder="Search…" value={query} onChange={setQuery} />
            <div className="space-y-1">
              {list.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "tap flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm no-select",
                    o.value === value ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                >
                  <span className="flex-1 truncate">{o.label}</span>
                  {o.value === value && (
                    <Check className="h-4 w-4 shrink-0 text-primary-foreground" />
                  )}
                </button>
              ))}
            </div>
            {!list.length && (
              <p className="py-6 text-center text-xs text-muted-foreground">No matches found</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ---------------- date ---------------- */

/** "yyyy-mm-dd" → local Date (no UTC shift). */
function parseISODate(v?: string): Date | undefined {
  const m = v && /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return undefined;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function toISODate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function describeDate(d: Date): string {
  const today = new Date();
  if (isSameDay(d, today)) return `Today · ${format(d, "d MMM yyyy")}`;
  if (isSameDay(d, addDays(today, -1))) return `Yesterday · ${format(d, "d MMM yyyy")}`;
  if (isSameDay(d, addDays(today, 1))) return `Tomorrow · ${format(d, "d MMM yyyy")}`;
  return format(d, "EEE, d MMM yyyy");
}

/**
 * Date field that opens a calendar card, styled like the Account / Category pickers.
 * Value is a "yyyy-mm-dd" string ("" when empty).
 *
 * Keyboard: Enter/Space opens · arrows move a day/week · PgUp/PgDn month ·
 * Shift+PgUp/PgDn year · Home/End week start/end · Enter picks ·
 * T today · Y yesterday · Esc closes.
 */
export function DatePicker({
  value,
  onChange,
  title = "Date",
  placeholder = "Pick a date",
  clearable = false,
  min,
  max,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  title?: string;
  placeholder?: string;
  /** show a "Clear" chip that sets the value to "" */
  clearable?: boolean;
  /** "yyyy-mm-dd" bounds */
  min?: string;
  max?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selected = parseISODate(value);
  const minDate = parseISODate(min);
  const maxDate = parseISODate(max);
  const today = new Date();
  const yesterday = addDays(today, -1);
  const inRange = (d: Date) =>
    (!minDate || toISODate(d) >= toISODate(minDate)) &&
    (!maxDate || toISODate(d) <= toISODate(maxDate));

  function pick(d: Date | undefined) {
    if (!d || !inRange(d)) return;
    onChange(toISODate(d));
    setOpen(false);
  }

  const quick = [
    { label: "Today", key: "T", date: today },
    { label: "Yesterday", key: "Y", date: yesterday },
  ].filter((q) => inRange(q.date));

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`${title}: ${selected ? format(selected, "EEEE, d MMMM yyyy") : placeholder}`}
        className={cn(
          "tap flex h-10 w-full items-center gap-2 rounded-xl border bg-card px-3 text-left text-sm no-select",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span
          className={cn(
            "num min-w-0 flex-1 truncate",
            selected ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {selected ? describeDate(selected) : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          // Put focus on the selected day (else today) so arrows / Enter work right away.
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            const root = e.currentTarget as HTMLElement;
            const focusDay = () => {
              const day =
                root.querySelector<HTMLButtonElement>("[data-selected-single='true']") ??
                root.querySelector<HTMLButtonElement>(".rdp-today button") ??
                root.querySelector<HTMLButtonElement>(".rdp-day button[tabindex='0']") ??
                root.querySelector<HTMLButtonElement>(".rdp-day button");
              day?.focus();
            };
            focusDay();
            requestAnimationFrame(focusDay);
          }}
          // Hand focus back to the date field so Tab carries on through the form.
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            triggerRef.current?.focus();
          }}
          onKeyDown={(e) => {
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            if ((e.target as HTMLElement).tagName === "SELECT") return;
            const k = e.key.toLowerCase();
            if (k === "t" && inRange(today)) {
              e.preventDefault();
              pick(today);
            } else if (k === "y" && inRange(yesterday)) {
              e.preventDefault();
              pick(yesterday);
            }
          }}
          className={cn(
            "max-h-[85vh] overflow-y-auto rounded-3xl no-select sm:max-w-sm",
            "max-sm:top-auto max-sm:bottom-0 max-sm:w-full max-sm:max-w-full max-sm:translate-y-0 max-sm:max-h-[90dvh]",
            "max-sm:rounded-b-none max-sm:rounded-t-[32px] max-sm:pb-[calc(1.5rem+env(safe-area-inset-bottom))]",
          )}
        >
          <DialogHeader>
            <DialogTitle className="text-base">{title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {(quick.length > 0 || (clearable && value)) && (
              <div className="flex flex-wrap gap-2">
                {quick.map((q) => {
                  const active = !!selected && isSameDay(selected, q.date);
                  return (
                    <button
                      key={q.label}
                      type="button"
                      onClick={() => pick(q.date)}
                      className={cn(
                        "tap inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "bg-card hover:bg-muted",
                      )}
                    >
                      {q.label}
                      <kbd
                        className={cn(
                          "hidden rounded border px-1 font-mono text-[10px] font-medium sm:inline",
                          active ? "border-primary-foreground/40" : "text-muted-foreground",
                        )}
                      >
                        {q.key}
                      </kbd>
                    </button>
                  );
                })}
                {clearable && value && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange("");
                      setOpen(false);
                    }}
                    className="tap inline-flex h-9 items-center rounded-full border px-3.5 text-xs font-bold text-destructive hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}

            <div className="rounded-2xl border bg-card">
              <Calendar
                mode="single"
                autoFocus
                required={false}
                selected={selected}
                defaultMonth={selected ?? (maxDate && maxDate < today ? maxDate : today)}
                onSelect={(d) => pick(d)}
                startMonth={minDate ?? new Date(today.getFullYear() - 20, 0)}
                endMonth={maxDate ?? new Date(today.getFullYear() + 30, 11)}
                disabled={[
                  ...(minDate ? [{ before: minDate }] : []),
                  ...(maxDate ? [{ after: maxDate }] : []),
                ]}
                captionLayout="dropdown"
                weekStartsOn={1}
                className="w-full bg-transparent p-2 [--cell-size:2.25rem] max-sm:[--cell-size:2.75rem]"
                classNames={{
                  root: "w-full",
                  // Today: bold teal number instead of a filled square, so it never clashes with the selection.
                  today:
                    "rdp-today rounded-md [&:not([data-selected=true])>button]:font-bold [&:not([data-selected=true])>button]:text-primary",
                }}
              />
            </div>

            <p className="hidden text-center text-[11px] text-muted-foreground sm:block">
              ←↑↓→ move · PgUp/PgDn month · Enter pick · Esc close
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
