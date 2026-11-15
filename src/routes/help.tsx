import { Fragment, useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, HelpCircle, Keyboard, Search } from "lucide-react";

import { HELP, SHORTCUTS, searchHelp } from "@/lib/help";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help — How SmartBudget works" },
      {
        name: "description",
        content:
          "Learn every SmartBudget feature: budgeting, accounts, SmartPay, reconciliation and more.",
      },
    ],
  }),
  component: HelpPage,
});

/** Render **bold** and `keys` inside help text. */
function rich(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p, i) =>
    p.startsWith("**") ? (
      <strong key={i} className="font-semibold text-foreground">
        {p.slice(2, -2)}
      </strong>
    ) : p.startsWith("`") ? (
      <kbd
        key={i}
        className="num rounded-md border border-border bg-muted px-1.5 py-0.5 text-[0.8em] font-semibold text-foreground"
      >
        {p.slice(1, -1)}
      </kbd>
    ) : (
      <Fragment key={i}>{p}</Fragment>
    ),
  );
}

function Article({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="border-t border-border py-4 first:border-t-0">
      <h3 className="mb-1.5 text-base font-bold">{title}</h3>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </article>
  );
}

const KEYS_ID = "keys";

function HelpPage() {
  const [query, setQuery] = useState("");
  const [sectionId, setSectionId] = useState<string>(HELP[0]!.id);
  const q = query.trim();
  const results = useMemo(() => searchHelp(q), [q]);
  const section = HELP.find((x) => x.id === sectionId) ?? HELP[0]!;

  return (
    <div className="space-y-6">
      <header>
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          <HelpCircle className="h-4 w-4" /> Help
        </p>
        <h1 className="text-2xl font-bold">How SmartBudget works</h1>
      </header>

      {/* Search pill */}
      <label className="flex h-12 items-center gap-3 rounded-full bg-card px-5 shadow-sm ring-1 ring-border/60 focus-within:ring-2 focus-within:ring-primary/40">
        <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search help"
          aria-label="Search help"
          className="h-full min-w-0 flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
      </label>

      <div className="grid gap-6 md:grid-cols-[210px_1fr]">
        {/* Section nav */}
        <nav
          aria-label="Help topics"
          className="flex gap-2 overflow-x-auto pb-1 no-scrollbar md:flex-col md:gap-1 md:overflow-visible md:pb-0"
        >
          {HELP.map((x) => {
            const active = !q && x.id === section.id;
            const Icon = x.icon;
            return (
              <button
                key={x.id}
                type="button"
                onClick={() => {
                  setQuery("");
                  setSectionId(x.id);
                }}
                className={cn(
                  "tap flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                <span className="whitespace-nowrap">{x.title}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSectionId(KEYS_ID);
            }}
            className={cn(
              "tap flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
              !q && sectionId === KEYS_ID
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Keyboard className="h-[18px] w-[18px]" strokeWidth={2} />
            <span className="whitespace-nowrap">Keyboard shortcuts</span>
          </button>
        </nav>

        {/* Body */}
        <section className="surface min-w-0 px-5 py-4 md:px-6">
          {q ? (
            <>
              <h2 className="mb-2 text-lg font-bold">
                {results.length} result{results.length === 1 ? "" : "s"} for “{q}”
              </h2>
              {results.map(({ section: sx, item }) => (
                <Article key={`${sx.id}-${item.id}`} title={item.title}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {sx.title}
                  </p>
                  {item.body.map((b, i) => (
                    <p key={i}>{rich(b)}</p>
                  ))}
                </Article>
              ))}
              {!results.length && (
                <p className="py-6 text-sm text-muted-foreground">
                  Nothing found for “{q}”. Try another word.
                </p>
              )}
            </>
          ) : sectionId === KEYS_ID ? (
            <>
              <h2 className="text-lg font-bold">Keyboard shortcuts</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                SmartBudget is quick to drive from the keyboard.
              </p>
              <dl className="mt-4 divide-y divide-border">
                {SHORTCUTS.map((s) => (
                  <div key={s.keys} className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-sm text-foreground">{s.action}</dt>
                    <dd>
                      <kbd className="num rounded-md border border-border bg-muted px-2 py-1 text-xs font-semibold text-foreground">
                        {s.keys}
                      </kbd>
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-bold">{section.title}</h2>
                {section.href && (
                  <Link
                    to={section.href}
                    className="tap flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-primary hover:bg-muted"
                  >
                    Open <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{section.intro}</p>
              <div className="mt-3">
                {section.items.map((item) => (
                  <Article key={item.id} title={item.title}>
                    {item.body.map((b, i) => (
                      <p key={i}>{rich(b)}</p>
                    ))}
                  </Article>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
