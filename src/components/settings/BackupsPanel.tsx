import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Download, Loader2, Plus, Save, Trash2, Undo2 } from "lucide-react";
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
import { Category, Group, Radio, Row, type Icon } from "@/components/MaterialList";
import { getCurrentHomeId, handleAuthError } from "@/lib/lock";
import { initDB, waitForPendingSave } from "@/lib/store";
import type { BackupMeta, BackupSchedule } from "@/lib/server-backups";
import { timeAgo } from "@/lib/format";

const SCHEDULE_OPTIONS: { value: BackupSchedule; label: string }[] = [
  { value: "daily", label: "Every day" },
  { value: "weekly", label: "Every week" },
  { value: "monthly", label: "Every month" },
  { value: "yearly", label: "Every year" },
  { value: "never", label: "Never" },
];

const REASON: Record<BackupMeta["reason"], { label: string; icon: Icon }> = {
  auto: { label: "Automatic", icon: CalendarClock },
  manual: { label: "Made by you", icon: Save },
  update: { label: "Before update", icon: Download },
  restore: { label: "Before restore", icon: Undo2 },
};

const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

type State = { backups: BackupMeta[]; schedule: BackupSchedule; lastAutoAt: number | null };

const PREVIEW_COUNT = 8;

/** Server backups for the current household: schedule, list, back up now, restore. */
export function BackupsPanel() {
  const homeId = getCurrentHomeId();
  const [data, setData] = useState<State | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState<null | "create" | "restore" | "schedule" | "delete">(null);
  const [showAll, setShowAll] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<BackupMeta | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BackupMeta | null>(null);

  const load = useCallback(async () => {
    try {
      const { listBackupsApi } = await import("@/lib/api");
      setData(await listBackupsApi({ data: { homeId } }));
      setLoadError(false);
    } catch (err) {
      if (!handleAuthError(err)) setLoadError(true);
    }
  }, [homeId]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeSchedule(schedule: BackupSchedule) {
    if (!data || schedule === data.schedule) return;
    const previous = data.schedule;
    setData({ ...data, schedule });
    setBusy("schedule");
    try {
      const { setBackupScheduleApi } = await import("@/lib/api");
      await setBackupScheduleApi({ data: { homeId, schedule } });
    } catch (err) {
      handleAuthError(err);
      setData((d) => (d ? { ...d, schedule: previous } : d));
      toast.error("Couldn't change the schedule");
    } finally {
      setBusy(null);
    }
  }

  async function backUpNow() {
    setBusy("create");
    try {
      await waitForPendingSave(); // include any edit that's still uploading
      const { createBackupApi } = await import("@/lib/api");
      const res = await createBackupApi({ data: { homeId } });
      if (!res.ok) toast.error(res.error ?? "Couldn't make a backup");
      else toast.success("Backup saved");
      await load();
    } catch (err) {
      handleAuthError(err);
      toast.error("Couldn't make a backup");
    } finally {
      setBusy(null);
    }
  }

  async function restore(b: BackupMeta) {
    setBusy("restore");
    try {
      await waitForPendingSave(); // so an unsent edit can't overwrite the restore
      const { restoreBackupApi } = await import("@/lib/api");
      const res = await restoreBackupApi({ data: { homeId, id: b.id } });
      if (!res.ok) {
        toast.error(res.error ?? "Couldn't restore that backup");
      } else {
        await initDB(true);
        toast.success(`Restored the backup from ${dateFmt.format(b.createdAt)}`);
      }
      await load();
    } catch (err) {
      handleAuthError(err);
      toast.error("Couldn't restore that backup");
    } finally {
      setBusy(null);
    }
  }

  async function remove(b: BackupMeta) {
    setBusy("delete");
    try {
      const { deleteBackupApi } = await import("@/lib/api");
      await deleteBackupApi({ data: { homeId, id: b.id } });
      await load();
      toast.success("Backup deleted");
    } catch (err) {
      handleAuthError(err);
      toast.error("Couldn't delete that backup");
    } finally {
      setBusy(null);
    }
  }

  if (loadError) {
    return (
      <>
        <Category>Saved backups</Category>
        <Group>
          <Row title="Couldn't load backups" summary="Check your connection" onClick={load} />
        </Group>
      </>
    );
  }

  const backups = data?.backups ?? [];
  const visible = showAll ? backups : backups.slice(0, PREVIEW_COUNT);

  return (
    <>
      <Category>Automatic backups</Category>
      <Group>
        {SCHEDULE_OPTIONS.map((o) => (
          <Row
            key={o.value}
            title={o.label}
            onClick={() => changeSchedule(o.value)}
            trailing={<Radio checked={data?.schedule === o.value} />}
          />
        ))}
      </Group>
      <p className="px-5 pt-2 text-sm text-muted-foreground">
        {!data
          ? " "
          : data.schedule === "never"
            ? "Automatic backups are off."
            : data.lastAutoAt
              ? `Last automatic backup ${timeAgo(data.lastAutoAt)}. Made when your budget changes and one is due.`
              : "Made when your budget changes and one is due."}
      </p>

      <Category>Saved backups</Category>
      <Group>
        <Row
          icon={busy === "create" ? Loader2 : Plus}
          title="Back up now"
          summary="Save a copy of this household's budget on the server"
          onClick={busy ? undefined : backUpNow}
        />
        {!data ? (
          <Row title="Loading…" />
        ) : backups.length === 0 ? (
          <Row title="No backups yet" summary="Your first one appears here" />
        ) : (
          visible.map((b) => {
            const r = REASON[b.reason];
            return (
              <Row
                key={b.id}
                icon={r.icon}
                title={dateFmt.format(b.createdAt)}
                summary={`${r.label}${b.by ? ` by ${b.by}` : ""} · ${formatSize(b.size)}`}
                onClick={busy ? undefined : () => setRestoreTarget(b)}
                trailing={
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Delete backup from ${dateFmt.format(b.createdAt)}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(b);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteTarget(b);
                      }
                    }}
                    className="-mr-2 flex h-12 w-12 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-5 w-5" />
                  </span>
                }
              />
            );
          })
        )}
        {backups.length > PREVIEW_COUNT && (
          <Row
            title={showAll ? "Show fewer" : `Show all ${backups.length} backups`}
            onClick={() => setShowAll(!showAll)}
          />
        )}
      </Group>
      {backups.length > 0 && (
        <p className="px-5 pt-2 text-sm text-muted-foreground">
          Tap a backup to restore it. Your current budget is backed up first, so you can undo.
        </p>
      )}

      <AlertDialog open={!!restoreTarget} onOpenChange={(o) => !o && setRestoreTarget(null)}>
        <AlertDialogContent className="max-w-sm rounded-[28px] border-0 bg-card p-6 shadow-2xl">
          <AlertDialogHeader className="items-center text-center sm:text-center">
            <Undo2 className="mb-2 h-6 w-6 text-primary" />
            <AlertDialogTitle className="text-2xl font-normal">
              Restore this backup?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
              {restoreTarget &&
                `This household's budget goes back to how it was on ${dateFmt.format(restoreTarget.createdAt)}. Your current budget is backed up first, so you can undo this.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2 flex-row justify-end gap-2 sm:space-x-0">
            <AlertDialogCancel className="mt-0 h-10 rounded-full border-0 bg-transparent px-4 font-semibold text-primary shadow-none hover:bg-primary/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-10 rounded-full bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90"
              onClick={() => restoreTarget && restore(restoreTarget)}
            >
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-sm rounded-[28px] border-0 bg-card p-6 shadow-2xl">
          <AlertDialogHeader className="items-center text-center sm:text-center">
            <Trash2 className="mb-2 h-6 w-6 text-destructive" />
            <AlertDialogTitle className="text-2xl font-normal">
              Delete this backup?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
              {deleteTarget &&
                `The backup from ${dateFmt.format(deleteTarget.createdAt)} will be gone for good. Your current budget isn't affected.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2 flex-row justify-end gap-2 sm:space-x-0">
            <AlertDialogCancel className="mt-0 h-10 rounded-full border-0 bg-transparent px-4 font-semibold text-primary shadow-none hover:bg-primary/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-10 rounded-full bg-transparent px-4 font-semibold text-destructive shadow-none hover:bg-destructive/10"
              onClick={() => deleteTarget && remove(deleteTarget)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
