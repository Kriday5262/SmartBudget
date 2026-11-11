import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  DatabaseBackup,
  Download,
  GitCommitHorizontal,
  Loader2,
  RefreshCw,
  RotateCcw,
  Sparkles,
} from "lucide-react";
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
import { Category, FilledButton, Group, Row } from "@/components/MaterialList";
import { refreshUpdateStatus, requestUpdate, useUpdateStatus } from "@/lib/updates";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const short = (sha: string) => sha.slice(0, 7);
const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
/** Show "Updated" for this long after an update finishes. */
const RECENT_MS = 60 * 60 * 1000;

export function UpdatePanel() {
  const { status, checking } = useUpdateStatus();
  const [confirm, setConfirm] = useState(false);
  const [starting, setStarting] = useState(false);

  const updater = status?.updater;
  const inProgress = updater?.state === "requested" || updater?.state === "updating";
  // The server is already running a newer build than the one this page loaded.
  const newerLoaded = !!status && !!__APP_COMMIT__ && status.current.commit !== __APP_COMMIT__;
  const recentlyDone =
    updater?.state === "done" && !!updater.at && Date.now() - updater.at < RECENT_MS;
  const recentlyFailed =
    updater?.state === "failed" && !!updater.at && Date.now() - updater.at < RECENT_MS;

  // While updating, poll often; the app may be briefly unreachable as it restarts.
  useEffect(() => {
    if (!inProgress) return;
    const t = setInterval(() => refreshUpdateStatus(), 4000);
    return () => clearInterval(t);
  }, [inProgress]);

  async function startUpdate() {
    setStarting(true);
    const res = await requestUpdate();
    setStarting(false);
    if (!res.ok) return toast.error(res.error ?? "Couldn't start the update");
    toast.success(
      `Backed up ${res.backedUp} ${res.backedUp === 1 ? "household" : "households"}. Updating…`,
    );
  }

  let hero: { icon: typeof Sparkles; title: string; body: string; tone?: "danger" | "busy" };
  if (!status) {
    hero = { icon: Loader2, title: "Checking for updates…", body: "", tone: "busy" };
  } else if (newerLoaded) {
    hero = {
      icon: CheckCircle2,
      title: "SmartBudget was updated",
      body: "Reload to start using the new version.",
    };
  } else if (inProgress) {
    hero = {
      icon: Loader2,
      title: updater?.state === "requested" ? "Waiting to update…" : "Updating…",
      body:
        updater?.message ??
        (updater?.installed
          ? "Starting shortly. Your data has been backed up."
          : "Waiting for the server's updater to pick this up."),
      tone: "busy",
    };
  } else if (recentlyFailed) {
    hero = {
      icon: AlertTriangle,
      title: "The update didn't finish",
      body: updater?.message ?? "Your data is safe and the current version is still running.",
      tone: "danger",
    };
  } else if (status.updateAvailable) {
    hero = {
      icon: Sparkles,
      title: "Update available",
      body: `${status.behindBy} ${status.behindBy === 1 ? "change" : "changes"} since your version.`,
    };
  } else if (recentlyDone) {
    hero = { icon: CheckCircle2, title: "Updated", body: updater?.message ?? "" };
  } else {
    hero = { icon: CheckCircle2, title: "SmartBudget is up to date", body: "" };
  }
  const HeroIcon = hero.icon;

  return (
    <>
      <section className="mt-4 flex flex-col items-center rounded-[28px] bg-card px-6 pb-7 pt-8 text-center">
        <span
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-full",
            hero.tone === "danger"
              ? "bg-destructive/12 text-destructive"
              : "bg-primary/15 text-primary",
          )}
        >
          <HeroIcon className={cn("h-8 w-8", hero.tone === "busy" && "animate-spin")} />
        </span>
        <h2 className="mt-4 text-2xl text-foreground">{hero.title}</h2>
        {hero.body && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{hero.body}</p>}
        {status && (
          <p className="mt-3 text-xs text-muted-foreground">
            Version {status.current.version}
            {status.current.commit && ` · ${short(status.current.commit)}`}
            {status.checkedAt && ` · checked ${timeAgo(status.checkedAt)}`}
          </p>
        )}
        {status?.error && !inProgress && (
          <p className="mt-2 text-xs text-destructive">{status.error}</p>
        )}

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {newerLoaded ? (
            <FilledButton onClick={() => window.location.reload()}>
              <RotateCcw className="h-4 w-4" /> Reload
            </FilledButton>
          ) : (
            <>
              {status?.updateAvailable && !inProgress && (
                <FilledButton
                  onClick={() => setConfirm(true)}
                  disabled={starting || !updater?.installed}
                >
                  <Download className="h-4 w-4" /> Update now
                </FilledButton>
              )}
              {!inProgress && (
                <FilledButton
                  variant="tonal"
                  onClick={() => refreshUpdateStatus(true)}
                  disabled={checking}
                >
                  <RefreshCw className={cn("h-4 w-4", checking && "animate-spin")} />
                  {checking ? "Checking…" : "Check for updates"}
                </FilledButton>
              )}
            </>
          )}
        </div>
      </section>

      {status && !updater?.installed && !newerLoaded && (
        <div className="mt-4 flex gap-3 rounded-[28px] bg-destructive/10 px-5 py-4 text-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <p className="text-foreground">
            One-tap updates aren't on for this server yet. They switch on by themselves the next
            time SmartBudget is started on the server with ./start.sh (the server needs cron
            installed).
          </p>
        </div>
      )}

      {status?.updateAvailable && status.changes.length > 0 && !newerLoaded && (
        <>
          <Category>What's new</Category>
          <Group>
            {status.changes.map((c) => (
              <Row
                key={c.sha}
                icon={GitCommitHorizontal}
                title={c.message || "Update"}
                summary={`${c.date ? dateFmt.format(new Date(c.date)) + " · " : ""}${short(c.sha)}`}
              />
            ))}
          </Group>
          {status.behindBy > status.changes.length && (
            <p className="px-5 pt-2 text-sm text-muted-foreground">
              And {status.behindBy - status.changes.length} more.
            </p>
          )}
        </>
      )}

      <Category>Your data stays safe</Category>
      <Group>
        <Row
          icon={DatabaseBackup}
          title="Backed up first"
          summary="Every household is backed up, and the server copies its whole data folder before updating"
        />
        <Row
          icon={RotateCcw}
          title="Rolls back by itself"
          summary="If the new version doesn't start, the previous one comes back automatically"
        />
        <Row
          icon={RefreshCw}
          title="Checked every day"
          summary="SmartBudget looks for new versions once a day"
        />
      </Group>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent className="max-w-sm rounded-[28px] border-0 bg-card p-6 shadow-2xl">
          <AlertDialogHeader className="items-center text-center sm:text-center">
            <Download className="mb-2 h-6 w-6 text-primary" />
            <AlertDialogTitle className="text-2xl font-normal">
              Update SmartBudget?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
              Every household is backed up first. SmartBudget will be unavailable for a few minutes
              while it restarts, for everyone using it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2 flex-row justify-end gap-2 sm:space-x-0">
            <AlertDialogCancel className="mt-0 h-10 rounded-full border-0 bg-transparent px-4 font-semibold text-primary shadow-none hover:bg-primary/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-10 rounded-full bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90"
              onClick={startUpdate}
            >
              Update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
