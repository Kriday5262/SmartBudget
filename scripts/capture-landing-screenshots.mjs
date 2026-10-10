/**
 * Captures mobile screenshots of SmartBudget for the public landing page.
 * Run: npm run build && npx vite preview --port 5173 &
 *      node scripts/capture-landing-screenshots.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../public/landing");
const BASE = process.env.PREVIEW_URL || "http://127.0.0.1:5173";

const PAGES = [
  { file: "home", path: "/home", wait: 2500 },
  { file: "budget", path: "/budget", wait: 2000 },
  { file: "pay", path: "/pay", wait: 2000 },
  { file: "reports", path: "/reports", wait: 3500 },
  { file: "settings", path: "/settings", wait: 2000 },
];

const PASSWORDS = ["SmartHome@2012", "password123", "smartbudget"];

async function isDashboard(page) {
  return page
    .getByText("Ready to Assign")
    .isVisible({ timeout: 2000 })
    .catch(() => false);
}

async function tryLogin(page) {
  if (await isDashboard(page)) return true;

  const userField = page.getByPlaceholder("Username (e.g. admin)");
  if (!(await userField.isVisible({ timeout: 3000 }).catch(() => false))) {
    return await isDashboard(page);
  }

  const creds = [
    ["shantanu", "SmartHome@2012"],
    ["admin", "secret"],
    ["shantanu", "secret"],
  ];

  for (const [username, pwd] of creds) {
    await userField.fill(username);
    await page.getByPlaceholder("Password").fill(pwd);
    await page.getByRole("button", { name: /^Sign In$/ }).click();
    await page.waitForTimeout(2500);
    if (await isDashboard(page)) return true;
  }

  await page.getByRole("button", { name: "Create" }).click();
  await page.getByPlaceholder("Full Name").fill("Demo Family");
  await page.getByPlaceholder("Choose Username").fill("demolanding");
  await page.getByPlaceholder("Password", { exact: true }).fill("demolanding1");
  const confirm = page.getByPlaceholder("Confirm Password");
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.fill("demolanding1");
  }
  await page.getByRole("button", { name: /Create account|Sign Up|Register/i }).click();
  await page.waitForTimeout(3000);
  return await isDashboard(page);
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: "light",
  });

  await context.addInitScript(() => {
    sessionStorage.setItem("smartbudget.lock.session_open", "1");
    localStorage.setItem("smartbudget.users.active", "shantanu");
    localStorage.setItem(
      "smartbudget.users.v1",
      JSON.stringify([
        {
          id: "usr-shantanu",
          name: "Shantanu",
          username: "shantanu",
          homeId: "home-default",
          homes: ["home-default"],
          createdAt: "2025-01-01",
        },
      ]),
    );
    localStorage.setItem("smartbudget.homes.active", "home-default");
  });

  const page = await context.newPage();

  await page.goto(`${BASE}/home`, { waitUntil: "networkidle", timeout: 60000 });
  const onLock = await page
    .getByRole("heading", { name: "SmartBudget" })
    .locator("xpath=ancestor::form")
    .isVisible({ timeout: 2000 })
    .catch(() => false);
  if (onLock) {
    const loggedIn = await tryLogin(page);
    if (!loggedIn) console.warn("Login fallback failed — UI may show lock screen.");
  }
  await page.waitForTimeout(2000);

  for (const { file, path: route, wait } of PAGES) {
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(wait);
    const outPath = path.join(OUT, `${file}.png`);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log("Wrote", outPath);
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
