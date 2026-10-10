/** Routes that render outside AppShell and do not require unlock. */
const PUBLIC_PATHS = new Set(["/", "/features"]);

export function isPublicPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  return PUBLIC_PATHS.has(path);
}
