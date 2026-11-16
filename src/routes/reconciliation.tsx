import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Folder, Scale, Settings2, TriangleAlert } from "lucide-react";
import { BankMark } from "@/components/BankMark";
import { CardBrandMark } from "@/components/CardBrandMark";

import {
  useDB,
  accountBalance,
  categoryAvailable,
  readyToAssign,
  sortedAccounts,
  type CategoryGroup,
  type DB,
} from "@/lib/store";
import { currencySymbol, amountNumber, money, monthKey, monthLabel } from "@/lib/format";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reconciliation")({
  head: () => ({
    meta: [
      { title: "Reconciliation — accounts vs budget | SmartBudget" },
      {
        name: "description",
        content:
          "Verify that account balances match their allocated budget envelopes, group by group.",
      },
      { property: "og:title", content: "Reconciliation — accounts vs budget | SmartBudget" },
      {
        property: "og:description",
        content: "Match every account balance to its budget envelope and flag any variance.",
      },
    ],
  }),
  component: ReconciliationPage,
});

/** Available balance of a whole budget group: all its categories added up. */
function groupAllocation(db: DB, g: CategoryGroup, month: string): number {
  return db.categories
    .filter((c) => c.groupId === g.id)
    .reduce((s, c) => s + categoryAvailable(db, c.id, month), 0);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function ReconciliationPage() {
  const db = useDB();
  const hydrated = useHydrated();
  const month = monthKey();

  if (!hydrated) return <div className="shimmer h-96 rounded-2xl" />;

  const links = db.reconLinks ?? [];

  // Order accounts and groups the same way the Accounts and Budget screens do,
  // regardless of the order they were picked in.
  const orderedAccounts = sortedAccounts(db, { includeClosed: true });
  const orderedGroups = [...db.categoryGroups].sort((a, b) => a.sortOrder - b.sortOrder);

  // Resolve each mapping to its live accounts and groups, dropping any that were
  // deleted since the mapping was made.
  const rows = links.map((link) => {
    const accountIds = new Set(link.accountIds);
    const groupIds = new Set(link.groupIds);
    const accounts = orderedAccounts
      .filter((a) => accountIds.has(a.id))
      .map((a) => ({ account: a, balance: accountBalance(db, a.id).total }));
    const groups = orderedGroups
      .filter((g) => groupIds.has(g.id))
      .map((g) => ({ group: g, available: groupAllocation(db, g, month) }));

    const accountTotal = accounts.reduce((s, a) => s + a.balance, 0);
    const groupTotal = groups.reduce((s, g) => s + g.available, 0);
    const difference = round2(accountTotal - groupTotal);

    return { ...link, accounts, groups, accountTotal, groupTotal, difference };
  });

  const netDifference = round2(rows.reduce((s, r) => s + r.accountTotal - r.groupTotal, 0));
  const balancedCount = rows.filter((r) => r.difference === 0).length;
  const toAssign = readyToAssign(db, month);
  // Unassigned money sits in accounts but in no budget group, so it shows up as a gap.
  const explainedByReady = netDifference !== 0 && round2(netDifference - toAssign) === 0;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Scale className="h-6 w-6 text-primary" /> Reconciliation
          </h1>
          <p className="text-sm text-muted-foreground">
            {monthLabel(month)} · Do your accounts hold what your budget says?
          </p>
        </div>
        <Link
          to="/settings"
          search={{ section: "reconciliation" }}
          className="tap flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-muted"
        >
          <Settings2 className="h-4 w-4" />
          <span className="max-sm:hidden">Edit mappings</span>
          <span className="sm:hidden">Edit</span>
        </Link>
      </header>

      {rows.length === 0 ? (
        <section className="surface flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Scale className="h-6 w-6" />
          </span>
          <div className="space-y-1">
            <p className="font-bold">No mappings yet</p>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              Link a set of accounts to the budget groups they pay for, and this page checks that
              the two always add up.
            </p>
          </div>
          <Link
            to="/settings"
            search={{ section: "reconciliation" }}
            className="tap mt-1 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
          >
            Set up a mapping <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      ) : (
        <>
          {/* Summary */}
          <section className="animate-bounce-in flex flex-col items-center py-1 text-center">
            <p className="text-sm text-muted-foreground">
              {netDifference === 0 ? "Everything balances" : "Unaccounted for"}
            </p>
            <p
              className={cn(
                "num mt-1 text-[clamp(2.25rem,12vw,3rem)] font-bold leading-none",
                netDifference === 0 ? "text-foreground" : "text-destructive",
              )}
            >
              <span className={netDifference === 0 ? "text-primary" : "text-destructive"}>
                {currencySymbol()}
              </span>{" "}
              {amountNumber(Math.abs(netDifference))}
            </p>
            <p
              className={cn(
                "mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold",
                balancedCount === rows.length
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-destructive/30 bg-destructive/10 text-destructive",
              )}
            >
              {balancedCount === rows.length ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <TriangleAlert className="h-3.5 w-3.5" />
              )}
              {balancedCount} of {rows.length} {rows.length === 1 ? "mapping" : "mappings"} balanced
            </p>
            {explainedByReady && (
              <p className="mt-3 max-w-md text-xs text-muted-foreground">
                That&apos;s exactly your Ready to Assign — money in your accounts that isn&apos;t in
                a budget group yet.{" "}
                <Link to="/budget" className="font-bold text-primary">
                  Assign it on Budget
                </Link>
              </p>
            )}
          </section>

          {/* One card per mapping */}
          <div className="space-y-4">
            {rows.map((row) => (
              <MappingCard key={row.id} row={row} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type Row = {
  id: string;
  label: string;
  accounts: { account: DB["accounts"][number]; balance: number }[];
  groups: { group: CategoryGroup; available: number }[];
  accountTotal: number;
  groupTotal: number;
  difference: number;
};

function MappingCard({ row }: { row: Row }) {
  const balanced = row.difference === 0;
  const scale = Math.max(Math.abs(row.accountTotal), Math.abs(row.groupTotal), 1);
  const accountPct = (Math.max(row.accountTotal, 0) / scale) * 100;
  const groupPct = (Math.max(row.groupTotal, 0) / scale) * 100;

  return (
    <section className="surface @container overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="min-w-0 truncate font-bold">{row.label}</h2>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold",
            balanced ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
          )}
        >
          {balanced ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" /> Balanced
            </>
          ) : (
            <>
              <TriangleAlert className="h-3.5 w-3.5" /> Off by{" "}
              <span className="num">{money(Math.abs(row.difference))}</span>
            </>
          )}
        </span>
      </header>

      <div className="grid gap-4 p-4 @2xl:grid-cols-2 @2xl:gap-6">
        <Column
          title="In your accounts"
          total={row.accountTotal}
          empty="No accounts linked"
          items={row.accounts.map(({ account: a, balance }) => ({
            id: a.id,
            name: a.name,
            amount: balance,
            mark:
              a.type === "credit" && a.brand ? (
                <CardBrandMark brand={a.brand} className="h-5 w-8 shrink-0" />
              ) : (
                <BankMark bank={a.bank} logo={a.bankLogo} className="h-5 w-5 shrink-0" />
              ),
          }))}
        />
        <Column
          title="In your budget"
          total={row.groupTotal}
          empty="No budget groups linked"
          items={row.groups.map(({ group: g, available }) => ({
            id: g.id,
            name: g.name,
            amount: available,
            mark: <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />,
          }))}
        />
      </div>

      {/* Accounts vs budget, side by side */}
      <footer className="space-y-2.5 border-t border-border bg-muted/30 px-4 py-3">
        <Bar label="Accounts" pct={accountPct} className="bg-primary" />
        <Bar label="Budget" pct={groupPct} className="bg-foreground/40" />
        <p className="text-xs text-muted-foreground">
          {balanced ? (
            "All the money in these accounts has a job in these groups."
          ) : row.difference > 0 ? (
            <>
              Your accounts hold{" "}
              <span className="num font-bold text-foreground">{money(row.difference)}</span> more
              than these groups have available.
            </>
          ) : (
            <>
              These groups expect{" "}
              <span className="num font-bold text-foreground">
                {money(Math.abs(row.difference))}
              </span>{" "}
              more than the accounts hold.
            </>
          )}
        </p>
      </footer>
    </section>
  );
}

function Column({
  title,
  total,
  items,
  empty,
}: {
  title: string;
  total: number;
  items: { id: string; name: string; amount: number; mark: React.ReactNode }[];
  empty: string;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </p>
        <p className="num text-base font-bold">{money(total)}</p>
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
          {empty}
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-2.5 px-3 py-2.5">
              {it.mark}
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{it.name}</span>
              <span
                className={cn(
                  "num shrink-0 text-sm tabular-nums",
                  it.amount < 0 ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {money(it.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Bar({ label, pct, className }: { label: string; pct: number; className: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", className)}
          style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }}
        />
      </div>
    </div>
  );
}
