/**
 * Server-only helpers that tie the app's server functions to a signed-in user.
 *
 * Sign-in sets an HttpOnly `smartbudget_session` cookie (the same cookie the
 * REST API in src/server.ts uses). Every server function then works out who
 * the caller is from that cookie — never from a username sent by the browser.
 *
 * Only import this from inside server function handlers (dynamic import), like
 * ./server-db.
 */
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import {
  createSessionServer,
  loadUsersServer,
  resolveSessionServer,
  revokeSessionServer,
} from "./server-db";

export const SESSION_COOKIE = "smartbudget_session";

/** "Stay signed in" sessions last longer than the default 7 days. */
const REMEMBERED_SESSION_MS = 180 * 24 * 60 * 60 * 1000;

/** Error messages the client recognises (see handleAuthError in ./lock). */
export const UNAUTHORIZED = "UNAUTHORIZED";
export const FORBIDDEN = "FORBIDDEN";

export function startSession(username: string, homes: string[], remember: boolean): void {
  const session = createSessionServer(
    username,
    homes,
    remember ? REMEMBERED_SESSION_MS : undefined,
  );
  setCookie(SESSION_COOKIE, session.token, {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    // Without "stay signed in", the cookie ends when the browser closes.
    ...(remember ? { maxAge: Math.floor((session.expiresAt - Date.now()) / 1000) } : {}),
  });
}

export function endSession(): void {
  const token = getCookie(SESSION_COOKIE);
  if (token) revokeSessionServer(token);
  deleteCookie(SESSION_COOKIE, { path: "/" });
}

/** The signed-in user, with their *current* household list. Throws if not signed in. */
export function requireUser(): { username: string; homes: string[] } {
  const token = getCookie(SESSION_COOKIE);
  const session = token ? resolveSessionServer(token) : null;
  if (!session) throw new Error(UNAUTHORIZED);
  // Households can be created or joined after sign-in, so read the live list.
  const user = loadUsersServer("default").find(
    (u) => u.username.toLowerCase() === session.username.toLowerCase(),
  );
  if (!user) throw new Error(UNAUTHORIZED);
  const homes = Array.from(new Set([...(user.homes ?? []), user.homeId].filter(Boolean)));
  return { username: user.username, homes };
}

/** Like requireUser, but also checks the user belongs to this household. */
export function requireHome(homeId: string): { username: string; homes: string[] } {
  const user = requireUser();
  if (!user.homes.includes(homeId)) throw new Error(FORBIDDEN);
  return user;
}
