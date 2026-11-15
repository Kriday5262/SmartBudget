import { useState } from "react";
import { toast } from "sonner";
import { Check, Plus, Scale, Trash2 } from "lucide-react";

import {
  Category,
  FilledButton,
  Group,
  InlineForm,
  Row,
  TextField,
} from "@/components/MaterialList";
import {
  useDB,
  addReconLink,
  updateReconLink,
  removeReconLink,
  sortedAccounts,
  type ReconLink,
} from "@/lib/store";
import { cn } from "@/lib/utils";

/** A tappable checkbox chip for the multi-selects. */
function Chip({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "tap inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
        checked
          ? "border-primary bg-primary/15 font-semibold text-primary"
          : "border-border bg-card text-foreground hover:bg-muted",
      )}
    >
      {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      <span className="truncate">{label}</span>
    </button>
  );
}

type Draft = { label: string; accountIds: string[]; groupIds: string[] };

const EMPTY_DRAFT: Draft = { label: "", accountIds: [], groupIds: [] };

/** Add or edit a single account ↔ budget-group mapping. */
function LinkForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: ReconLink;
  onSubmit: (draft: Draft) => void;
  onCancel: () => void;
}) {
  const db = useDB();
  const [draft, setDraft] = useState<Draft>(
    initial
      ? {
          label: initial.label,
          accountIds: [...initial.accountIds],
          groupIds: [...initial.groupIds],
        }
      : EMPTY_DRAFT,
  );

  // Same order as the Accounts and Budget screens.
  const accounts = sortedAccounts(db);
  const groups = db.categoryGroups
    .filter((g) => !g.hidden)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const toggle = (field: "accountIds" | "groupIds", id: string) =>
    setDraft((d) => ({
      ...d,
      [field]: d[field].includes(id) ? d[field].filter((x) => x !== id) : [...d[field], id],
    }));

  return (
    <InlineForm
      submitLabel={initial ? "Save" : "Add"}
      onCancel={onCancel}
      onSubmit={() => {
        const label = draft.label.trim();
        if (!label) return toast.error("Give the mapping a name");
        if (draft.accountIds.length === 0 && draft.groupIds.length === 0)
          return toast.error("Pick at least one account or budget group");
        onSubmit({ ...draft, label });
      }}
    >
      <TextField
        label="Name"
        hint="For example a person or a goal — Alex, House fund"
        autoFocus
        value={draft.label}
        onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
      />

      <div className="space-y-2">
        <p className="px-1 text-sm font-medium text-foreground">Accounts</p>
        {accounts.length ? (
          <div className="flex flex-wrap gap-2">
            {accounts.map((a) => (
              <Chip
                key={a.id}
                label={a.name}
                checked={draft.accountIds.includes(a.id)}
                onToggle={() => toggle("accountIds", a.id)}
              />
            ))}
          </div>
        ) : (
          <p className="px-1 text-xs text-muted-foreground">No accounts yet.</p>
        )}
      </div>

      <div className="space-y-2">
        <p className="px-1 text-sm font-medium text-foreground">Budget groups</p>
        {groups.length ? (
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <Chip
                key={g.id}
                label={g.name}
                checked={draft.groupIds.includes(g.id)}
                onToggle={() => toggle("groupIds", g.id)}
              />
            ))}
          </div>
        ) : (
          <p className="px-1 text-xs text-muted-foreground">No budget groups yet.</p>
        )}
      </div>
    </InlineForm>
  );
}

export function ReconciliationPanel() {
  const db = useDB();
  const links = db.reconLinks ?? [];
  // null = nothing open, "new" = add form, otherwise the id being edited.
  const [editing, setEditing] = useState<null | "new" | string>(null);

  // Names listed in the same order as the Accounts and Budget screens.
  const accountNames = (ids: string[]) => {
    const set = new Set(ids);
    return sortedAccounts(db, { includeClosed: true })
      .filter((a) => set.has(a.id))
      .map((a) => a.name);
  };
  const groupNames = (ids: string[]) => {
    const set = new Set(ids);
    return [...db.categoryGroups]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .filter((g) => set.has(g.id))
      .map((g) => g.name);
  };

  return (
    <>
      <p className="px-2 pb-2 pt-1 text-sm text-muted-foreground">
        Map a set of accounts to the budget groups that should hold the same money. The
        Reconciliation screen then flags any mapping whose balances don't net to zero.
      </p>

      <Category>Mappings</Category>
      <Group>
        {links.map((link) =>
          editing === link.id ? (
            <LinkForm
              key={link.id}
              initial={link}
              onCancel={() => setEditing(null)}
              onSubmit={(draft) => {
                updateReconLink(link.id, draft);
                setEditing(null);
                toast.success("Mapping saved");
              }}
            />
          ) : (
            <Row
              key={link.id}
              leading={
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Scale className="h-5 w-5" />
                </span>
              }
              title={link.label}
              summary={[
                accountNames(link.accountIds).join(", ") || "No accounts",
                groupNames(link.groupIds).join(", ") || "No groups",
              ].join(" ↔ ")}
              onClick={() => setEditing(link.id)}
              trailing={
                <button
                  type="button"
                  aria-label={`Delete ${link.label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeReconLink(link.id);
                    toast.success("Mapping removed");
                  }}
                  className="-mr-2 flex h-12 w-12 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              }
            />
          ),
        )}

        {editing === "new" ? (
          <LinkForm
            onCancel={() => setEditing(null)}
            onSubmit={(draft) => {
              addReconLink(draft);
              setEditing(null);
              toast.success("Mapping added");
            }}
          />
        ) : (
          <Row
            icon={Plus}
            title="Add mapping"
            summary={links.length ? undefined : "Link accounts to their budget groups"}
            onClick={() => setEditing("new")}
          />
        )}
      </Group>
    </>
  );
}
