import { createServerFn } from "@tanstack/react-start";

/*
 * Every function here (except sign-up and sign-in) works out who is calling
 * from the HttpOnly session cookie set at sign-in — see ./server-auth. A
 * username sent by the browser is never trusted.
 */

export const fetchDB = createServerFn({ method: "POST" })
  .validator((data: { homeId: string }) => data)
  .handler(async (ctx) => {
    const { requireHome } = await import("./server-auth");
    const { loadDBForClient } = await import("./server-db");
    const { homeId } = ctx.data as { homeId: string };
    requireHome(homeId);
    return loadDBForClient(homeId);
  });

export const saveDB = createServerFn({ method: "POST" })
  .validator((data: { json: any; homeId: string }) => data)
  .handler(async (ctx) => {
    const { requireHome } = await import("./server-auth");
    const { saveDBValue } = await import("./server-db");
    const data = ctx.data as { json: any; homeId: string };
    requireHome(data.homeId);
    const json = typeof data.json === "string" ? data.json : JSON.stringify(data.json);
    const { autoBackupIfDue } = await import("./server-backups");
    autoBackupIfDue(data.homeId); // snapshots the pre-save budget when a backup is due
    saveDBValue(json, data.homeId);
    return { ok: true };
  });

/** Users who share at least one household with the caller (no password hashes). */
export const fetchUsers = createServerFn({ method: "GET" }).handler(async () => {
  const { requireUser } = await import("./server-auth");
  const { loadUsersServer } = await import("./server-db");
  const me = requireUser();
  return loadUsersServer("default")
    .filter(
      (u) =>
        u.username === me.username ||
        [...(u.homes ?? []), u.homeId].some((h) => h && me.homes.includes(h)),
    )
    .map((u) => {
      const { passwordHash: _omit, ...safe } = u;
      return safe;
    });
});

/** Sign up. Signs the new user in unless `startSession` is false. */
export const registerUserApi = createServerFn({ method: "POST" })
  .validator(
    (data: {
      name: string;
      username: string;
      password?: string;
      remember?: boolean;
      startSession?: boolean;
    }) => data,
  )
  .handler(async (ctx) => {
    const { registerUserServer } = await import("./server-db");
    const input = ctx.data as {
      name: string;
      username: string;
      password?: string;
      remember?: boolean;
      startSession?: boolean;
    };
    const res = registerUserServer(input);
    if (res.ok && res.user && input.startSession !== false) {
      const { startSession } = await import("./server-auth");
      startSession(res.user.username, res.user.homes ?? [res.user.homeId], !!input.remember);
    }
    return res;
  });

/** Sign in. Locks the account for 15 minutes after 5 wrong passwords. */
export const verifyUserApi = createServerFn({ method: "POST" })
  .validator((data: { username: string; password: string; remember?: boolean }) => data)
  .handler(async (ctx) => {
    const { verifyUserServer, isAccountLocked, recordLoginFailure, clearLoginFailures } =
      await import("./server-db");
    const input = ctx.data as { username: string; password: string; remember?: boolean };
    const username = (input.username || "").trim();
    if (isAccountLocked(username)) {
      return {
        ok: false as const,
        error: "Too many wrong attempts. Try again in 15 minutes.",
      };
    }
    const res = verifyUserServer(username, input.password);
    if (!res.ok || !res.user) {
      recordLoginFailure(username);
      return { ok: false as const };
    }
    clearLoginFailures(username);
    const { startSession } = await import("./server-auth");
    startSession(res.user.username, res.user.homes ?? [res.user.homeId], !!input.remember);
    return res;
  });

export const logoutApi = createServerFn({ method: "POST" }).handler(async () => {
  const { endSession } = await import("./server-auth");
  endSession();
  return { ok: true };
});

export const changeUserPasswordApi = createServerFn({ method: "POST" })
  .validator((data: { current: string; next: string }) => data)
  .handler(async (ctx) => {
    const { requireUser } = await import("./server-auth");
    const { changeUserPasswordServer } = await import("./server-db");
    const me = requireUser();
    const input = ctx.data as { current: string; next: string };
    return changeUserPasswordServer(me.username, input.current, input.next);
  });

/** Update the caller's own profile and theme. */
export const updateUserApi = createServerFn({ method: "POST" })
  .validator(
    (data: {
      name?: string;
      avatarDataUrl?: string;
      themeMode?: "light" | "dark" | "system";
      themePreset?: string;
      themeCustomHex?: string;
    }) => data,
  )
  .handler(async (ctx) => {
    const { requireUser } = await import("./server-auth");
    const { updateUserServer } = await import("./server-db");
    const me = requireUser();
    const input = ctx.data as {
      name?: string;
      avatarDataUrl?: string;
      themeMode?: "light" | "dark" | "system";
      themePreset?: string;
      themeCustomHex?: string;
    };
    return updateUserServer(me.username, input);
  });

export const joinHomeApi = createServerFn({ method: "POST" })
  .validator((data: { code: string }) => data)
  .handler(async (ctx) => {
    const { requireUser } = await import("./server-auth");
    const { joinHomeServer } = await import("./server-db");
    const me = requireUser();
    return joinHomeServer((ctx.data as { code: string }).code, me.username);
  });

export const createHomeApi = createServerFn({ method: "POST" })
  .validator((data: { name: string }) => data)
  .handler(async (ctx) => {
    const { requireUser } = await import("./server-auth");
    const { createHomeServer } = await import("./server-db");
    const me = requireUser();
    return createHomeServer((ctx.data as { name: string }).name, me.username);
  });

/** Search banks worldwide by name, with logos (done here so the browser contacts no one else). */
export const searchBanksApi = createServerFn({ method: "POST" })
  .validator((data: { query: string }) => data)
  .handler(async (ctx) => {
    const { requireUser } = await import("./server-auth");
    const { ipRateLimited } = await import("./server-db");
    const { searchBanksServer } = await import("./server-banks");
    const me = requireUser();
    if (ipRateLimited(`bank-search:${me.username}`, 60, 60_000)) return [];
    return searchBanksServer(String((ctx.data as { query: string }).query ?? ""));
  });

/** The logo for one bank from a recent search (by its id), as a data: URL. */
export const bankLogoApi = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async (ctx) => {
    const { requireUser } = await import("./server-auth");
    const { bankLogoServer } = await import("./server-banks");
    requireUser();
    const id = String((ctx.data as { id: string }).id ?? "");
    if (!/^Q\d{1,12}$/.test(id)) return null;
    return (await bankLogoServer(id)) ?? null;
  });

/** Create a login for someone in the caller's household (it opens that household by default). */
export const createMemberAccountApi = createServerFn({ method: "POST" })
  .validator((data: { homeId: string; name: string; username: string; password: string }) => data)
  .handler(async (ctx) => {
    const { requireHome } = await import("./server-auth");
    const { createMemberAccountServer, ipRateLimited } = await import("./server-db");
    const input = ctx.data as { homeId: string; name: string; username: string; password: string };
    requireHome(input.homeId);
    if (ipRateLimited(`member-create:${input.homeId}`, 20, 60 * 60_000)) {
      return { ok: false, error: "Too many new accounts. Try again later." };
    }
    return createMemberAccountServer(input, input.homeId);
  });

export const renameHomeApi = createServerFn({ method: "POST" })
  .validator((data: { homeId: string; name: string }) => data)
  .handler(async (ctx) => {
    const { requireHome } = await import("./server-auth");
    const { renameHomeServer } = await import("./server-db");
    const { homeId, name } = ctx.data as { homeId: string; name: string };
    requireHome(homeId);
    return renameHomeServer(homeId, name);
  });

/* ── Backups ─────────────────────────────────────────────────────── */

export const listBackupsApi = createServerFn({ method: "POST" })
  .validator((data: { homeId: string }) => data)
  .handler(async (ctx) => {
    const { requireHome } = await import("./server-auth");
    const { listBackups, getSchedule, lastAutoBackupAt } = await import("./server-backups");
    const { homeId } = ctx.data as { homeId: string };
    requireHome(homeId);
    return {
      backups: listBackups(homeId),
      schedule: getSchedule(homeId),
      lastAutoAt: lastAutoBackupAt(homeId),
    };
  });

export const createBackupApi = createServerFn({ method: "POST" })
  .validator((data: { homeId: string }) => data)
  .handler(async (ctx) => {
    const { requireHome } = await import("./server-auth");
    const { createBackup } = await import("./server-backups");
    const { homeId } = ctx.data as { homeId: string };
    const me = requireHome(homeId);
    const meta = createBackup(homeId, "manual", me.username);
    return meta
      ? { ok: true as const, backup: meta }
      : { ok: false as const, error: "Nothing to back up yet." };
  });

export const restoreBackupApi = createServerFn({ method: "POST" })
  .validator((data: { homeId: string; id: string }) => data)
  .handler(async (ctx) => {
    const { requireHome } = await import("./server-auth");
    const { restoreBackup } = await import("./server-backups");
    const { homeId, id } = ctx.data as { homeId: string; id: string };
    const me = requireHome(homeId);
    return restoreBackup(homeId, id, me.username);
  });

export const deleteBackupApi = createServerFn({ method: "POST" })
  .validator((data: { homeId: string; id: string }) => data)
  .handler(async (ctx) => {
    const { requireHome } = await import("./server-auth");
    const { deleteBackup } = await import("./server-backups");
    const { homeId, id } = ctx.data as { homeId: string; id: string };
    requireHome(homeId);
    deleteBackup(homeId, id);
    return { ok: true };
  });

export const setBackupScheduleApi = createServerFn({ method: "POST" })
  .validator(
    (data: { homeId: string; schedule: "daily" | "weekly" | "monthly" | "yearly" | "never" }) =>
      data,
  )
  .handler(async (ctx) => {
    const { requireHome } = await import("./server-auth");
    const { setSchedule } = await import("./server-backups");
    const { homeId, schedule } = ctx.data as {
      homeId: string;
      schedule: "daily" | "weekly" | "monthly" | "yearly" | "never";
    };
    requireHome(homeId);
    setSchedule(homeId, schedule);
    return { ok: true };
  });

/* ── Updates ─────────────────────────────────────────────────────── */

export const getUpdateStatusApi = createServerFn({ method: "POST" })
  .validator((data: { force?: boolean } | undefined) => data ?? {})
  .handler(async (ctx) => {
    const { requireUser } = await import("./server-auth");
    const { getUpdateStatus } = await import("./server-updates");
    requireUser();
    return getUpdateStatus(!!(ctx.data as { force?: boolean }).force);
  });

export const requestUpdateApi = createServerFn({ method: "POST" }).handler(async () => {
  const { requireUser } = await import("./server-auth");
  const { requestUpdate } = await import("./server-updates");
  const me = requireUser();
  return requestUpdate(me.username);
});
