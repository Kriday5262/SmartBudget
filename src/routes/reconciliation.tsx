import { createFileRoute } from "@tanstack/react-router";
import { Scale } from "lucide-react";

import {
  useDB,
  accountBalance,
  categoryAvailable,
  type Account,
  type CategoryGroup,
  type DB,
} from "@/lib/store";
import { money, monthKey } from "@/lib/format";
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

/** Case-insensitive substring match on an account name. */
function accountName(a: Account, needle: string): boolean {
  return a.name.toLowerCase().includes(needle.toLowerCase());
}

/**
 * One row per budget group that has accounts named after it — for example the
 * group "Alex" and the accounts "Alex's Savings" and "Cash: Alex". Built from
 * the household's own data, so it works for any family.
 */
type ReconGroup = {
  key: string;
  label: string;
  group: CategoryGroup;
  accounts: Account[];
};

function buildReconGroups(db: DB): ReconGroup[] {
  return db.categoryGroups
    .filter((g) => !g.hidden && g.name.trim().length >= 2)
    .map((g) => ({
      key: g.id,
      label: g.name,
      group: g,
      // Only on-budget, open accounts, so off-budget savings (RDs/FDs) that
      // share a name don't get pulled in.
      accounts: db.accounts.filter((a) => a.onBudget && !a.closed && accountName(a, g.name.trim())),
    }))
    .filter((rg) => rg.accounts.length > 0);
}

function ReconciliationPage() {
  const db = useDB();
  const hydrated = useHydrated();
  const month = monthKey();

  if (!hydrated) return <div className="shimmer h-96 rounded-2xl" />;

  const rows = buildReconGroups(db).map((rg) => {
    const usedAccounts = rg.accounts;
    const usedGroups = [rg.group];

    const accountTotal = usedAccounts.reduce((s, a) => s + accountBalance(db, a.id).total, 0);
    const groupTotal = usedGroups.reduce(
      (s, g) =>
        s +
        db.categories
          .filter((c) => c.groupId === g.id)
          .reduce((t, c) => t + categoryAvailable(db, c.id, month), 0),
      0,
    );
    const difference = Math.round((accountTotal - groupTotal) * 100) / 100;
    const unbalanced = difference !== 0;

    return {
      ...rg,
      usedAccounts,
      usedGroups,
      accountTotal,
      groupTotal,
      difference,
      unbalanced,
    };
  });

  // Net totals include only the accounts and budget groups involved on this page.
  const involvedAccountIds = new Set(rows.flatMap((r) => r.usedAccounts.map((a) => a.id)));
  const involvedGroupIds = new Set(rows.flatMap((r) => r.usedGroups.map((g) => g.id)));

  const allAccountTotal = db.accounts
    .filter((a) => involvedAccountIds.has(a.id))
    .reduce((s, a) => s + accountBalance(db, a.id).total, 0);
  const allGroupTotal = db.categoryGroups
    .filter((g) => involvedGroupIds.has(g.id))
    .reduce(
      (s, g) =>
        s +
        db.categories
          .filter((c) => c.groupId === g.id)
          .reduce((t, c) => t + categoryAvailable(db, c.id, month), 0),
      0,
    );
  const netDifference = Math.round((allAccountTotal - allGroupTotal) * 100) / 100;
  const netUnbalanced = netDifference !== 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Scale className="h-6 w-6 text-primary" /> Reconciliation
        </h1>
        <p className="text-sm text-muted-foreground">
          {month} · Accounts vs budget envelopes — every group should net to zero.
        </p>
      </header>

      <section className="surface overflow-hidden">
        <div className="grid grid-cols-[2fr_2fr_1fr] gap-x-6 border-b border-border bg-muted/40 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <span>Accounts</span>
          <span>Budget Groups</span>
          <span className="text-right">Difference</span>
        </div>

        {rows.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Nothing to compare yet. Give an account the same name as a budget group (for example the
            group “Alex” and the account “Alex's Savings”) and it appears here.
          </p>
        )}
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.key}>
              <div className="px-4 pt-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {row.label}
                </p>
              </div>

              <div className="grid grid-cols-[2fr_2fr_1fr] items-start gap-x-6 px-4 py-2.5">
                <div className="min-w-0">
                  <ul className="space-y-0.5">
                    {row.usedAccounts.map((a) => (
                      <li key={a.id} className="flex items-baseline justify-between gap-4">
                        <span className="truncate text-sm font-medium">{a.name}</span>
                        <span className="num shrink-0 text-right text-sm text-muted-foreground">
                          {money(accountBalance(db, a.id).total)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1.5 border-t border-dashed border-border pt-1 text-right text-sm font-bold">
                    {money(row.accountTotal)}
                  </p>
                </div>

                <div className="min-w-0">
                  <ul className="space-y-0.5">
                    {row.usedGroups.map((g) => (
                      <li key={g.id} className="flex items-baseline justify-between gap-4">
                        <span className="truncate text-sm font-medium">{g.name}</span>
                        <span className="num shrink-0 text-right text-sm text-muted-foreground">
                          {money(groupAllocation(db, g, month))}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1.5 border-t border-dashed border-border pt-1 text-right text-sm font-bold">
                    {money(row.groupTotal)}
                  </p>
                </div>

                <div className="self-end text-right">
                  <span
                    className={cn(
                      "num text-sm font-bold",
                      row.unbalanced ? "text-destructive" : "text-emerald-600",
                    )}
                  >
                    {money(row.difference)}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <footer className="grid grid-cols-[2fr_2fr_1fr] items-end gap-x-6 border-t-2 border-border px-4 py-3">
          <div />
          <div />
          <div className="text-right">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Net difference
            </p>
            <span
              className={cn(
                "num text-sm font-bold",
                netUnbalanced ? "text-destructive" : "text-emerald-600",
              )}
            >
              {money(netDifference)}
            </span>
          </div>
        </footer>
      </section>
    </div>
  );
}

function groupAllocation(db: DB, g: CategoryGroup, month: string): number {
  return db.categories
    .filter((c) => c.groupId === g.id)
    .reduce((s, c) => s + categoryAvailable(db, c.id, month), 0);
}
