import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Banknote, Copy, Home, Palette, Share2, UserPlus, Users } from "lucide-react";
import { Mascot } from "./Mascot";
import { CurrencyPicker } from "./CurrencyPicker";
import { AddMemberForm } from "./AddMemberForm";
import { ThemeColourGrid, ThemeModePicker } from "./settings/ThemeControls";
import { Category, FilledButton, Group, Row, TextField } from "./MaterialList";
import {
  useDB,
  getActiveHousehold,
  renameHousehold,
  createHousehold,
  setSetting,
  memberUsername,
} from "@/lib/store";
import { getActiveUser } from "@/lib/lock";
import { useTheme } from "@/lib/theme";
import { startGuide } from "@/lib/guide";
import { uiActions } from "@/lib/ui-store";
import { cn } from "@/lib/utils";

type Step = "welcome" | "name" | "currency" | "theme" | "members" | "done";

/**
 * First-run setup, in the app's own style. Two modes:
 *  - "setup": a brand-new account or household (welcome → name → currency →
 *    look → people → done)
 *  - "new-home": Settings › Add household. The name step creates the household,
 *    then the rest of the steps set it up.
 */
export function SetupWizard({ mode }: { mode: "setup" | "new-home" }) {
  const db = useDB();
  const home = getActiveHousehold(db);
  const firstName = (getActiveUser()?.name ?? "").split(" ")[0];

  const steps: Step[] =
    mode === "new-home"
      ? ["name", "currency", "members", "done"]
      : ["welcome", "name", "currency", "theme", "members", "done"];
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const step = steps[index];

  // In "new-home" mode nothing exists until the name step creates it.
  const [created, setCreated] = useState(mode === "setup");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(mode === "setup" ? home.name : "");

  function go(delta: 1 | -1) {
    setDir(delta > 0 ? "fwd" : "back");
    setIndex((i) => Math.min(steps.length - 1, Math.max(0, i + delta)));
  }

  async function next() {
    if (busy) return;
    if (step === "name") {
      const clean = name.trim();
      if (!clean) return toast.error("Give your home a name");
      if (!created) {
        setBusy(true);
        const id = await createHousehold(clean);
        setBusy(false);
        if (!id) return toast.error("Couldn't create the household. Try again.");
        setCreated(true);
      } else if (clean !== home.name) {
        renameHousehold(clean).then((ok) => {
          if (!ok) toast.error("Couldn't save the name on the server");
        });
      }
    }
    go(1);
  }

  /** Close the wizard; the household is marked as set up. */
  function close(then?: "tour") {
    if (created) setSetting("onboarded", "1");
    uiActions.closeSetup();
    if (then === "tour") setTimeout(startGuide, 300);
  }

  // Enter continues (fields that use Enter themselves opt out).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.shiftKey) return;
      const t = e.target as HTMLElement;
      if (t.dataset.wizEnter === "self" || t.closest("form")) return;
      if (t.tagName === "BUTTON" && t.getAttribute("role") !== "radio") return;
      e.preventDefault();
      if (step === "done") close("tour");
      else next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const titles: Record<Step, { title: string; sub: string }> = {
    welcome: {
      title: firstName ? `Welcome, ${firstName}` : "Welcome",
      sub: "Let's get your household ready. It takes about a minute, and everything can be changed later in Settings.",
    },
    name: {
      title: mode === "new-home" ? "New household" : "Name your home",
      sub: "Everyone you invite sees this name.",
    },
    currency: { title: "Currency", sub: "Every amount in this household is shown in it." },
    theme: { title: "Appearance", sub: "Pick a look. It changes as you tap." },
    members: {
      title: "People",
      sub: "Invite with a code, or create a login for someone so this household opens when they sign in.",
    },
    done: {
      title: "You're all set",
      sub: `${name.trim() || home.name} is ready.`,
    },
  };

  const centred = step === "welcome" || step === "done";
  const canGoBack = index > 0 && step !== "done" && !(mode === "new-home" && step === "currency");
  const canCancel = !(mode === "new-home" && created) && step !== "done";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={mode === "new-home" ? "New household" : "Set up SmartBudget"}
      className="fixed inset-0 z-[70] overflow-y-auto bg-background"
    >
      <div className="mx-auto flex min-h-full max-w-2xl flex-col px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-6">
        {/* app bar */}
        <div className="flex items-center gap-2 pt-[calc(0.5rem+env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Back"
            className={cn(
              "-ml-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted",
              !canGoBack && "invisible",
            )}
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div
            className="h-1 flex-1 overflow-hidden rounded-full bg-primary/15"
            role="progressbar"
            aria-label="Setup progress"
            aria-valuemin={1}
            aria-valuemax={steps.length}
            aria-valuenow={index + 1}
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
              style={{ width: `${((index + 1) / steps.length) * 100}%` }}
            />
          </div>
          <FilledButton
            variant="text"
            className={cn(step === "done" && "invisible")}
            onClick={() => close()}
          >
            {canCancel ? (mode === "new-home" ? "Cancel" : "Skip") : "Finish later"}
          </FilledButton>
        </div>

        <div
          key={step}
          className={cn("flex-1", dir === "fwd" ? "animate-native-slide" : "sb-wiz-in-left")}
        >
          {centred && (
            <div className="flex justify-center pt-8">
              <Mascot size={96} happy={step === "done"} className="sb-penny-in" />
            </div>
          )}
          <h1
            className={cn(
              "px-2 pb-2 pt-4 font-display text-[36px] font-normal leading-tight tracking-tight text-foreground sm:text-[44px]",
              centred && "text-center",
            )}
          >
            {titles[step].title}
          </h1>
          <p
            className={cn(
              "px-2 text-[15px] text-muted-foreground",
              centred && "mx-auto max-w-md text-center",
            )}
          >
            {titles[step].sub}
          </p>

          {step === "welcome" && <WelcomeStep />}
          {step === "name" && <NameStep name={name} setName={setName} />}
          {step === "currency" && (
            <>
              <Category>Currency for {name.trim() || home.name}</Category>
              <CurrencyPicker />
            </>
          )}
          {step === "theme" && <ThemeStep />}
          {step === "members" && <MembersStep />}
          {step === "done" && <DoneStep />}
        </div>

        {/* bottom actions */}
        <div className="sticky bottom-0 -mx-4 mt-6 bg-gradient-to-t from-background via-background to-background/0 px-4 pb-1 pt-4 sm:-mx-6 sm:px-6">
          {step === "done" ? (
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <FilledButton className="h-12 flex-1" onClick={() => close("tour")}>
                Start the tour with Penny
              </FilledButton>
              <FilledButton variant="tonal" className="h-12 flex-1" onClick={() => close()}>
                I&apos;ll explore myself
              </FilledButton>
            </div>
          ) : (
            <div className="flex justify-end">
              <FilledButton className="h-12 min-w-[8rem]" onClick={next} disabled={busy}>
                {busy
                  ? "Creating…"
                  : step === "welcome"
                    ? "Get started"
                    : step === "name" && !created
                      ? "Create"
                      : "Continue"}
              </FilledButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Staggered fade-up for a step's rows. */
function Stagger({ i, children }: { i: number; children: React.ReactNode }) {
  return (
    <div className="sb-wiz-item" style={{ animationDelay: `${60 + i * 60}ms` }}>
      {children}
    </div>
  );
}

function WelcomeStep() {
  const items = [
    { icon: Home, title: "Name your home", summary: "What your household is called" },
    { icon: Banknote, title: "Pick a currency", summary: "Rupees, dollars, or your own" },
    { icon: Palette, title: "Choose a look", summary: "Light or dark, and a colour" },
    { icon: Users, title: "Add your people", summary: "Invite family to budget with you" },
  ];
  return (
    <>
      <Category>What we&apos;ll do</Category>
      <Group>
        {items.map((it, i) => (
          <Stagger key={it.title} i={i}>
            <Row icon={it.icon} title={it.title} summary={it.summary} />
          </Stagger>
        ))}
      </Group>
    </>
  );
}

function NameStep({ name, setName }: { name: string; setName: (v: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const first = (getActiveUser()?.name ?? "").split(" ")[0];
  const ideas = [first ? `${first}'s Home` : "Our Home", "Family Budget", "The Flat", "Home"];
  useEffect(() => {
    const t = setTimeout(() => ref.current?.querySelector("input")?.select(), 350);
    return () => clearTimeout(t);
  }, []);
  return (
    <>
      <Category>Household name</Category>
      <Group>
        <div ref={ref} className="space-y-4 bg-card px-5 py-5">
          <TextField
            label="Name"
            value={name}
            maxLength={60}
            placeholder="e.g. The Sharma Home"
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {ideas.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setName(s)}
                className={cn(
                  "h-8 rounded-lg border px-3 text-sm font-medium transition-colors",
                  name === s
                    ? "border-transparent bg-primary/20 text-foreground"
                    : "border-muted-foreground/40 text-muted-foreground hover:bg-muted",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </Group>
    </>
  );
}

function ThemeStep() {
  const { mode, preset, setMode, setPreset } = useTheme();
  return (
    <>
      <Category>Mode</Category>
      <Group>
        <ThemeModePicker mode={mode} setMode={setMode} />
      </Group>
      <Category>Theme colour</Category>
      <Group>
        <ThemeColourGrid preset={preset} setPreset={setPreset} />
      </Group>
    </>
  );
}

function MembersStep() {
  const db = useDB();
  const home = getActiveHousehold(db);
  const [adding, setAdding] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}/?join=${home.code}` : "";

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Join ${home.name} on SmartBudget`,
          text: `Join ${home.name} on SmartBudget with code ${home.code}`,
          url: link,
        });
        return;
      }
    } catch {
      return; // share sheet dismissed
    }
    await navigator.clipboard?.writeText(link);
    toast.success("Invite link copied");
  }

  return (
    <>
      <Category>Invite code</Category>
      <Group>
        <div className="bg-card px-5 py-6 text-center">
          <p className="num text-3xl font-semibold tracking-[0.18em] text-foreground">
            {home.code.split("").map((ch, i) => (
              <span
                key={i}
                className="sb-wiz-item inline-block"
                style={{ animationDelay: `${120 + i * 35}ms` }}
              >
                {ch}
              </span>
            ))}
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <FilledButton variant="tonal" onClick={share}>
              <Share2 className="h-4 w-4" /> Share link
            </FilledButton>
            <FilledButton
              variant="tonal"
              onClick={() => {
                navigator.clipboard?.writeText(home.code);
                toast.success("Invite code copied");
              }}
            >
              <Copy className="h-4 w-4" /> Copy code
            </FilledButton>
          </div>
        </div>
      </Group>

      <Category>People in {home.name}</Category>
      <Group>
        {home.members.map((m) => (
          <Row
            key={m.id}
            leading={
              <span className="sb-wiz-pop flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary">
                {m.name.trim().charAt(0).toUpperCase() || "?"}
              </span>
            }
            title={m.name}
            summary={[
              m.role === "owner" ? "Owner" : "Member",
              memberUsername(m, home.id) && `@${memberUsername(m, home.id)}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          />
        ))}
        {adding ? (
          <AddMemberForm onDone={() => setAdding(false)} onCancel={() => setAdding(false)} />
        ) : (
          <Row
            icon={UserPlus}
            title="Create a login for someone"
            summary="Username and password; this household opens when they sign in"
            onClick={() => setAdding(true)}
          />
        )}
      </Group>
    </>
  );
}

function DoneStep() {
  return (
    <div className="mx-auto mt-6 max-w-md">
      <Group>
        <div className="flex items-start gap-3 bg-card px-5 py-4">
          <Mascot size={40} className="mt-0.5" />
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Hi, I&apos;m Penny!</span> Want me to
            show you around? I&apos;ll help you add your first account, category and transaction.
          </p>
        </div>
      </Group>
    </div>
  );
}
