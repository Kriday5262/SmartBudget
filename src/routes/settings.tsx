import { useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  Copy,
  CreditCard,
  Database,
  Download,
  Home,
  HelpCircle,
  KeyRound,
  Lock as LockIcon,
  Palette,
  Plus,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  Share2,
  ShieldCheck,
  Smartphone,
  Trash2,
  Upload,
  UserPlus,
  X,
  Loader2,
  Banknote,
} from "lucide-react";
import {
  Category,
  FilledButton,
  Group,
  InlineForm,
  M3Switch,
  Radio,
  Row,
  TextField,
  type Icon,
} from "@/components/MaterialList";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useDB,
  getDB,
  addPayee,
  setSetting,
  replaceDB,
  resetDB,
  mutate,
  getHouseholds,
  getActiveHousehold,
  switchHousehold,
  useSwitchingHome,
  type DB,
} from "@/lib/store";
import { useTheme, THEME_PRESETS } from "@/lib/theme";
import { useUpdateStatus } from "@/lib/updates";
import { BackupsPanel } from "@/components/settings/BackupsPanel";
import { ReconciliationPanel } from "@/components/settings/ReconciliationPanel";
import { UpdatePanel } from "@/components/settings/UpdatePanel";
import { ThemeColourGrid, ThemeModePicker } from "@/components/settings/ThemeControls";
import { CurrencyPicker } from "@/components/CurrencyPicker";
import { AddMemberForm } from "@/components/AddMemberForm";
import { uiActions } from "@/lib/ui-store";
import { currentCurrency } from "@/lib/format";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";
import {
  changePassword,
  lock,
  useActiveUser,
  isRemembered,
  setRememberCookie,
  clearRememberCookie,
  MIN_PASSWORD_LENGTH,
} from "@/lib/lock";

const SECTIONS = [
  "appearance",
  "currency",
  "security",
  "homes",
  "payees",
  "reconciliation",
  "backups",
  "update",
] as const;

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  // Each section has its own URL (?section=security) so it can be linked to
  // and the browser's back button returns to the list.
  validateSearch: (search: Record<string, unknown>): { section?: (typeof SECTIONS)[number] } =>
    SECTIONS.includes(search.section as (typeof SECTIONS)[number])
      ? { section: search.section as (typeof SECTIONS)[number] }
      : {},
  head: () => ({
    meta: [
      { title: "Settings | SmartBudget" },
      {
        name: "description",
        content: "Manage your SmartBudget appearance, security, households, payees and backups.",
      },
    ],
  }),
});

type Page = "main" | (typeof SECTIONS)[number];

/* ── Page ────────────────────────────────────────────────────────── */

/** Small "something new" dot, as on Android settings rows. */
function UpdateDot() {
  return (
    <span className="flex items-center gap-2 text-sm font-semibold text-primary">
      <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden />
      <span className="sr-only">Update available</span>
    </span>
  );
}

export function SettingsPage() {
  const db = useDB();
  const hydrated = useHydrated();
  const { mode, setMode, preset, setPreset, customHex, setCustomHex } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);
  const { status: updateStatus } = useUpdateStatus();
  const navigate = useNavigate({ from: "/settings" });
  const { section } = Route.useSearch();
  const page: Page = section ?? "main";
  const [query, setQuery] = useState("");

  const [currentPass, setCurrentPass] = useState("");
  const [nextPass, setNextPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [busyPass, setBusyPass] = useState(false);
  const [cookieRemembered, setCookieRemembered] = useState(() => isRemembered());

  const [adding, setAdding] = useState<null | "password" | "home" | "member" | "payee">(null);
  const [payee, setPayee] = useState({ name: "", vpa: "" });
  const [confirmReset, setConfirmReset] = useState(false);

  const activeUser = useActiveUser();
  const activeHome = getActiveHousehold(db);
  const households = getHouseholds(db);
  const switchingTo = useSwitchingHome();
  const presetLabel = THEME_PRESETS.find((p) => p.id === preset)?.label ?? "Custom colour";

  if (!hydrated) return <div className="shimmer mx-auto h-96 max-w-2xl rounded-[28px]" />;

  function open(next: Page) {
    setAdding(null);
    navigate({ search: next === "main" ? {} : { section: next } });
    window.scrollTo({ top: 0 });
  }

  async function handlePasswordSave() {
    if (nextPass.length < MIN_PASSWORD_LENGTH)
      return toast.error(`New password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    if (nextPass !== confirmPass) return toast.error("New passwords do not match");
    setBusyPass(true);
    const ok = await changePassword(currentPass, nextPass);
    setBusyPass(false);
    if (!ok) return toast.error("Current password is incorrect");
    setCurrentPass("");
    setNextPass("");
    setConfirmPass("");
    setAdding(null);
    toast.success("Password updated");
  }

  function handleCookieToggle(val: boolean) {
    if (!val) {
      clearRememberCookie();
      setCookieRemembered(false);
      toast.success("You'll be asked to sign in on your next visit");
    } else {
      setRememberCookie(true, true);
      setCookieRemembered(true);
      toast.success("You'll stay signed in on this device");
    }
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(getDB(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smartbudget-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup downloaded");
  }

  function importData(file: File) {
    file
      .text()
      .then((txt) => {
        const next = JSON.parse(txt) as DB;
        if (!next.accounts || !next.transactions) throw new Error("bad file");
        replaceDB(next);
        toast.success("Data restored");
      })
      .catch(() => toast.error("That file isn't a SmartBudget backup"));
  }

  function copyCode() {
    navigator.clipboard.writeText(activeHome.code);
    toast.success("Invite code copied");
  }

  function copyLink() {
    const origin = window.location.origin;
    navigator.clipboard.writeText(`${origin}/?join=${activeHome.code}`);
    toast.success("Invite link copied");
  }

  const modeLabel = { light: "Light", dark: "Dark", system: "System" }[mode];
  const updateSummary = !updateStatus
    ? "Checks for new versions daily"
    : updateStatus.updateAvailable
      ? "Update available"
      : `Up to date · version ${updateStatus.current.version}`;

  // Top-level entries, also used for search.
  const entries: {
    id: string;
    group: number;
    icon: Icon;
    title: string;
    summary: string;
    keywords: string;
    action: () => void;
    badge?: boolean;
  }[] = [
    {
      id: "appearance",
      group: 0,
      icon: Palette,
      title: "Appearance",
      summary: `${modeLabel} mode · ${presetLabel}`,
      keywords: "theme colour color dark light mode",
      action: () => open("appearance"),
    },
    {
      id: "security",
      group: 0,
      icon: ShieldCheck,
      title: "Security",
      summary: "Password, stay signed in",
      keywords: "password sign in lock cookie",
      action: () => open("security"),
    },
    {
      id: "homes",
      group: 1,
      icon: Home,
      title: "Households",
      summary: `${activeHome.name} · ${activeHome.members.length} ${activeHome.members.length === 1 ? "member" : "members"}`,
      keywords: "home family share invite code members",
      action: () => open("homes"),
    },
    {
      id: "currency",
      group: 1,
      icon: Banknote,
      title: "Currency",
      summary: `${currentCurrency().name} (${currentCurrency().symbol}) · ${activeHome.name}`,
      keywords: "currency money rupee dollar euro symbol custom country",
      action: () => open("currency"),
    },
    {
      id: "payees",
      group: 1,
      icon: CreditCard,
      title: "Payees",
      summary: db.payees.length ? `${db.payees.length} saved` : "People you pay often",
      keywords: "upi pay payment link split",
      action: () => open("payees"),
    },
    {
      id: "reconciliation",
      group: 1,
      icon: Scale,
      title: "Reconciliation",
      summary: db.reconLinks?.length
        ? `${db.reconLinks.length} ${db.reconLinks.length === 1 ? "mapping" : "mappings"}`
        : "Map accounts to budget groups",
      keywords: "reconcile reconciliation map accounts budget groups envelopes balance match",
      action: () => open("reconciliation"),
    },
    {
      id: "backups",
      group: 2,
      icon: Database,
      title: "Backups",
      summary: "Automatic backups, restore an older version",
      keywords: "backup restore export import json reset schedule daily weekly monthly",
      action: () => open("backups"),
    },
    {
      id: "help",
      group: 2,
      icon: HelpCircle,
      title: "Help",
      summary: "How every feature works, and keyboard shortcuts",
      keywords: "help guide how to keyboard shortcuts keys hotkeys support",
      action: () => navigate({ to: "/help" }),
    },
    {
      id: "update",
      group: 3,
      icon: RefreshCw,
      title: "Software update",
      summary: updateSummary,
      keywords: "update upgrade version new release",
      action: () => open("update"),
      badge: !!updateStatus?.updateAvailable,
    },
    {
      id: "lock",
      group: 4,
      icon: LockIcon,
      title: "Lock app",
      summary: "Require your password to continue",
      keywords: "lock sign out logout",
      action: () => lock(),
    },
  ];

  const q = query.trim().toLowerCase();
  const matches = q
    ? entries.filter((e) => `${e.title} ${e.summary} ${e.keywords}`.toLowerCase().includes(q))
    : [];

  const subTitles: Record<Exclude<Page, "main">, string> = {
    appearance: "Appearance",
    security: "Security",
    homes: "Households",
    currency: "Currency",
    payees: "Payees",
    reconciliation: "Reconciliation",
    backups: "Backups",
    update: "Software update",
  };

  return (
    <div className="mx-auto max-w-2xl pb-16">
      {page === "main" ? (
        <div className="animate-native-slide">
          <h1 className="px-2 pb-6 pt-6 font-display text-[40px] font-normal leading-tight tracking-tight text-foreground sm:pt-10 sm:text-5xl">
            Settings
          </h1>

          {/* Search pill */}
          <label className="flex h-14 items-center gap-3 rounded-full bg-card px-5 shadow-sm ring-1 ring-border/60 transition-shadow focus-within:ring-2 focus-within:ring-primary/40">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search settings"
              aria-label="Search settings"
              className="h-full min-w-0 flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </label>

          {q ? (
            <div className="mt-6">
              {matches.length ? (
                <Group>
                  {matches.map((e) => (
                    <Row
                      key={e.id}
                      icon={e.icon}
                      title={e.title}
                      summary={e.summary}
                      onClick={e.action}
                    />
                  ))}
                </Group>
              ) : (
                <p className="px-5 py-10 text-center text-muted-foreground">
                  No settings match “{query}”
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Account card */}
              <Link
                to="/profile"
                className="mt-6 flex items-center gap-4 rounded-[28px] bg-primary/12 px-5 py-4 transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-xl font-semibold text-primary-foreground">
                  {activeUser?.avatarDataUrl ? (
                    <img
                      src={activeUser.avatarDataUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (activeUser?.name?.[0]?.toUpperCase() ?? "S")
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg text-foreground">{activeUser?.name ?? "Guest"}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {activeUser?.username ? `@${activeUser.username} · ` : ""}
                    {activeHome.name}
                  </p>
                </div>
                <span className="ml-auto shrink-0 text-sm font-semibold text-primary">Edit</span>
              </Link>

              <div className="mt-4 space-y-4">
                {[0, 1, 2, 3, 4].map((g) => (
                  <Group key={g}>
                    {entries
                      .filter((e) => e.group === g)
                      .map((e) => (
                        <Row
                          key={e.id}
                          icon={e.icon}
                          title={e.title}
                          summary={e.summary}
                          onClick={e.action}
                          trailing={e.badge ? <UpdateDot /> : undefined}
                        />
                      ))}
                  </Group>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div key={page} className="animate-native-slide">
          {/* Sub-page app bar */}
          <div className="-ml-1 pt-2">
            <button
              type="button"
              onClick={() => open("main")}
              aria-label="Back to settings"
              className="flex h-12 w-12 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
          </div>
          <h1 className="px-2 pb-2 pt-4 font-display text-[36px] font-normal leading-tight tracking-tight text-foreground sm:text-[44px]">
            {subTitles[page]}
          </h1>

          {page === "appearance" && (
            <>
              <Category>Mode</Category>
              <Group>
                <ThemeModePicker mode={mode} setMode={setMode} />
              </Group>

              <Category>Theme colour</Category>
              <Group>
                <ThemeColourGrid preset={preset} setPreset={setPreset} />
                <Row
                  leading={
                    <label
                      className={cn(
                        "relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full",
                        preset === "custom" &&
                          "ring-2 ring-foreground ring-offset-2 ring-offset-card",
                      )}
                      style={{ background: customHex }}
                    >
                      <input
                        type="color"
                        value={/^#[0-9a-fA-F]{6}$/.test(customHex) ? customHex : "#017565"}
                        onChange={(e) => {
                          setPreset("custom");
                          setCustomHex(e.target.value);
                        }}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        aria-label="Choose custom colour"
                      />
                    </label>
                  }
                  title="Custom colour"
                  summary={preset === "custom" ? "In use" : "Tap the circle to pick any colour"}
                  trailing={
                    <input
                      type="text"
                      value={customHex}
                      aria-label="Custom colour hex code"
                      spellCheck={false}
                      onChange={(e) => {
                        const v = e.target.value;
                        setCustomHex(v);
                        if (/^#[0-9a-fA-F]{6}$/.test(v)) setPreset("custom");
                      }}
                      className="h-10 w-28 rounded-full border border-border bg-background/60 px-4 font-mono text-sm uppercase text-foreground focus:border-primary focus:outline-none"
                    />
                  }
                />
              </Group>
            </>
          )}

          {page === "security" && (
            <>
              <Category>Sign-in</Category>
              <Group>
                <Row
                  icon={Smartphone}
                  title="Stay signed in on this device"
                  summary="Turn off to enter your password on every visit"
                  trailing={
                    <M3Switch
                      checked={cookieRemembered}
                      onChange={handleCookieToggle}
                      label="Stay signed in on this device"
                    />
                  }
                />
                <Row
                  icon={LockIcon}
                  title="Lock app now"
                  summary="You'll need your password to get back in"
                  onClick={() => lock()}
                />
              </Group>

              <Category>Password</Category>
              <Group>
                <Row
                  icon={KeyRound}
                  title="Change password"
                  summary={`At least ${MIN_PASSWORD_LENGTH} characters`}
                  onClick={() => setAdding(adding === "password" ? null : "password")}
                />
                {adding === "password" && (
                  <InlineForm
                    submitLabel={busyPass ? "Saving…" : "Save"}
                    onCancel={() => setAdding(null)}
                    onSubmit={handlePasswordSave}
                  >
                    <TextField
                      label="Current password"
                      type="password"
                      autoComplete="current-password"
                      autoFocus
                      value={currentPass}
                      onChange={(e) => setCurrentPass(e.target.value)}
                    />
                    <TextField
                      label="New password"
                      type="password"
                      autoComplete="new-password"
                      hint={`At least ${MIN_PASSWORD_LENGTH} characters`}
                      value={nextPass}
                      onChange={(e) => setNextPass(e.target.value)}
                    />
                    <TextField
                      label="Confirm new password"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPass}
                      onChange={(e) => setConfirmPass(e.target.value)}
                    />
                  </InlineForm>
                )}
              </Group>
            </>
          )}

          {page === "homes" && (
            <>
              <Category>Invite to {activeHome.name}</Category>
              <Group>
                <div className="bg-card px-5 py-6 text-center">
                  <p className="text-sm text-muted-foreground">Invite code</p>
                  <p className="num mt-1 text-3xl font-semibold tracking-[0.18em] text-foreground">
                    {activeHome.code}
                  </p>
                  <div className="mt-5 flex justify-center gap-2">
                    <FilledButton variant="tonal" onClick={copyLink}>
                      <Share2 className="h-4 w-4" /> Copy link
                    </FilledButton>
                    <FilledButton variant="tonal" onClick={copyCode}>
                      <Copy className="h-4 w-4" /> Copy code
                    </FilledButton>
                  </div>
                </div>
              </Group>

              <Category>Your households</Category>
              <Group>
                {households.map((h) => {
                  const on = h.id === activeHome.id;
                  const loading = switchingTo === h.id;
                  return (
                    <Row
                      key={h.id}
                      icon={Home}
                      title={h.name}
                      summary={loading ? "Switching…" : on ? "Current household" : `Code ${h.code}`}
                      onClick={() => {
                        if (on || switchingTo) return;
                        switchHousehold(h.id)
                          .then(() => toast.success(`Switched to ${h.name}`))
                          .catch(() =>
                            toast.error(`Couldn't switch to ${h.name}. Check your connection.`),
                          );
                      }}
                      trailing={
                        loading ? (
                          <Loader2
                            className="h-5 w-5 shrink-0 animate-spin text-primary"
                            aria-label="Loading"
                          />
                        ) : (
                          <Radio checked={on} />
                        )
                      }
                    />
                  );
                })}
                <Row
                  icon={Plus}
                  title="Add household"
                  summary="Set up a new home with its own budget"
                  onClick={() => uiActions.openNewHomeWizard()}
                />
              </Group>

              <Category>Members</Category>
              <Group>
                {activeHome.members.map((m) => (
                  <Row
                    key={m.id}
                    leading={
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary">
                        {m.name[0]?.toUpperCase()}
                      </span>
                    }
                    title={m.name}
                    summary={[
                      m.role === "owner" ? "Owner" : "Member",
                      m.username ? `@${m.username}` : "No login yet",
                    ].join(" · ")}
                  />
                ))}
                {adding === "member" ? (
                  <AddMemberForm onDone={() => setAdding(null)} onCancel={() => setAdding(null)} />
                ) : (
                  <Row icon={UserPlus} title="Add member" onClick={() => setAdding("member")} />
                )}
              </Group>
            </>
          )}

          {page === "currency" && (
            <>
              <Category>Currency for {activeHome.name}</Category>
              <CurrencyPicker />
            </>
          )}

          {page === "payees" && (
            <>
              <Category>Saved payees</Category>
              <Group>
                {db.payees.map((p) => (
                  <Row
                    key={p.id}
                    leading={
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary">
                        {p.name[0]?.toUpperCase()}
                      </span>
                    }
                    title={p.name}
                    summary={p.upiVpa || "No payment ID"}
                    trailing={
                      <button
                        type="button"
                        aria-label={`Delete ${p.name}`}
                        onClick={() => {
                          mutate((d) => (d.payees = d.payees.filter((x) => x.id !== p.id)));
                          toast.success("Payee removed");
                        }}
                        className="-mr-2 flex h-12 w-12 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    }
                  />
                ))}
                {adding === "payee" ? (
                  <InlineForm
                    submitLabel="Save"
                    onCancel={() => setAdding(null)}
                    onSubmit={() => {
                      if (!payee.name.trim()) return toast.error("Enter a payee name");
                      addPayee(payee.name.trim(), payee.vpa.trim() || undefined);
                      setPayee({ name: "", vpa: "" });
                      setAdding(null);
                      toast.success("Payee added");
                    }}
                  >
                    <TextField
                      label="Name"
                      autoFocus
                      value={payee.name}
                      onChange={(e) => setPayee({ ...payee, name: e.target.value })}
                    />
                    <TextField
                      label="UPI ID (optional)"
                      hint="For example name@bank"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={payee.vpa}
                      onChange={(e) => setPayee({ ...payee, vpa: e.target.value })}
                    />
                  </InlineForm>
                ) : (
                  <Row
                    icon={Plus}
                    title="Add payee"
                    summary={db.payees.length ? undefined : "Save people you pay often"}
                    onClick={() => setAdding("payee")}
                  />
                )}
              </Group>

              <Category>Payment links</Category>
              <Group>
                <div className="bg-card px-5 py-5">
                  <TextField
                    label="Link address"
                    hint="Used when you share a payment link in chat apps"
                    placeholder="https://budget.example.com"
                    value={db.settings.payLinkBase ?? ""}
                    onChange={(e) => setSetting("payLinkBase", e.target.value)}
                  />
                </div>
              </Group>
            </>
          )}

          {page === "reconciliation" && <ReconciliationPanel />}

          {page === "update" && <UpdatePanel />}

          {page === "backups" && (
            <>
              <BackupsPanel />

              <Category>Backup file</Category>
              <Group>
                <Row
                  icon={Download}
                  title="Download a backup file"
                  summary="Keep a copy of this budget on your own device"
                  onClick={exportData}
                />
                <Row
                  icon={Upload}
                  title="Restore from a file"
                  summary="Replaces your current budget with the file's"
                  onClick={() => fileRef.current?.click()}
                />
              </Group>
              <input
                ref={fileRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importData(f);
                  e.target.value = "";
                }}
              />

              <Category>Reset</Category>
              <Group>
                <Row
                  icon={RotateCcw}
                  tone="danger"
                  title="Reset data"
                  summary="Clear everything stored in this browser"
                  onClick={() => setConfirmReset(true)}
                />
              </Group>
            </>
          )}
        </div>
      )}

      {/* Reset confirmation (Material dialog) */}
      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent className="max-w-sm rounded-[28px] border-0 bg-card p-6 shadow-2xl">
          <AlertDialogHeader className="items-center text-center sm:text-center">
            <AlertTriangle className="mb-2 h-6 w-6 text-destructive" />
            <AlertDialogTitle className="text-2xl font-normal">Reset all data?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
              This clears everything stored in this browser and can't be undone. Download a backup
              first if you might need it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2 flex-row justify-end gap-2 sm:space-x-0">
            <AlertDialogCancel className="mt-0 h-10 rounded-full border-0 bg-transparent px-4 font-semibold text-primary shadow-none hover:bg-primary/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-10 rounded-full bg-transparent px-4 font-semibold text-destructive shadow-none hover:bg-destructive/10"
              onClick={() => {
                resetDB();
                toast.success("Data reset");
              }}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
