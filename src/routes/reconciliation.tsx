import { createFileRoute, Link } from "@tanstack/react-router";
import { Scale, Settings2 } from "lucide-react";

import { useDB, accountBalance, categoryAvailable, type CategoryGroup, type DB } from "@/lib/store";
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

/** Available balance of a whole budget group: all its categories added up. */
function groupAllocation(db: DB, g: CategoryGroup, month: string): number {
  return db.categories
    .filter((c) => c.groupId === g.id)
    .reduce((s, c) => s + categoryAvailable(db, c.id, month), 0);
}

function ReconciliationPage() {
  const db = useDB();
  const hydrated = useHydrated();
  const month = monthKey();

  if (!hydrated) return <div className="shimmer h-96 rounded-2xl" />;

  const links = db.reconLinks ?? [];

  // Resolve each mapping to its live accounts and groups, dropping any that were
  // deleted since the mapping was made.
  const rows = links.map((link) => {
    const accounts = link.accountIds
      .map((id) => db.accounts.find((a) => a.id === id))
      .filter((a): a is NonNullable<typeof a> => !!a);
    const groups = link.groupIds
      .map((id) => db.categoryGroups.find((g) => g.id === id))
      .filter((g): g is CategoryGroup => !!g);

    const accountTotal = accounts.reduce((s, a) => s + accountBalance(db, a.id).total, 0);
    const groupTotal = groups.reduce((s, g) => s + groupAllocation(db, g, month), 0);
    const difference = Math.round((accountTotal - groupTotal) * 100) / 100;

    return {
      ...link,
      accounts,
      groups,
      accountTotal,
      groupTotal,
      difference,
      unbalanced: difference !== 0,
    };
  });

  const netDifference =
    Math.round(rows.reduce((s, r) => s + r.accountTotal - r.groupTotal, 0) * 100) / 100;
  const netUnbalanced = netDifference !== 0;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Scale className="h-6 w-6 text-primary" /> Reconciliation
          </h1>
          <p className="text-sm text-muted-foreground">
            {month} · Accounts vs budget envelopes — every group should net to zero.
          </p>
        </div>
        <Link
          to="/settings"
          search={{ section: "reconciliation" }}
          className="tap flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-muted"
        >
          <Settings2 className="h-4 w-4" /> Edit mappings
        </Link>
      </header>

      <section className="surface overflow-hidden">
        <div className="grid grid-cols-[2fr_2fr_1fr] gap-x-6 border-b border-border bg-muted/40 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <span>Accounts</span>
          <span>Budget Groups</span>
          <span className="text-right">Difference</span>
        </div>

        {rows.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No mappings yet. Map your accounts to budget groups under{" "}
            <Link
              to="/settings"
              search={{ section: "reconciliation" }}
              className="font-bold text-primary"
            >
              Settings › Reconciliation
            </Link>{" "}
            and they appear here.
          </p>
        )}
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.id}>
              <div className="px-4 pt-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {row.label}
                </p>
              </div>

              <div className="grid grid-cols-[2fr_2fr_1fr] items-start gap-x-6 px-4 py-2.5">
                <div className="min-w-0">
                  <ul className="space-y-0.5">
                    {row.accounts.map((a) => (
                      <li key={a.id} className="flex items-baseline justify-between gap-4">
                        <span className="truncate text-sm font-medium">{a.name}</span>
                        <span className="num shrink-0 text-right text-sm text-muted-foreground">
                          {money(accountBalance(db, a.id).total)}
                        </span>
                      </li>
                    ))}
                    {row.accounts.length === 0 && (
                      <li className="text-sm text-muted-foreground">—</li>
                    )}
                  </ul>
                  <p className="mt-1.5 border-t border-dashed border-border pt-1 text-right text-sm font-bold">
                    {money(row.accountTotal)}
                  </p>
                </div>

                <div className="min-w-0">
                  <ul className="space-y-0.5">
                    {row.groups.map((g) => (
                      <li key={g.id} className="flex items-baseline justify-between gap-4">
                        <span className="truncate text-sm font-medium">{g.name}</span>
                        <span className="num shrink-0 text-right text-sm text-muted-foreground">
                          {money(groupAllocation(db, g, month))}
                        </span>
                      </li>
                    ))}
                    {row.groups.length === 0 && (
                      <li className="text-sm text-muted-foreground">—</li>
                    )}
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

        {rows.length > 0 && (
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
        )}
      </section>
    </div>
  );
}
