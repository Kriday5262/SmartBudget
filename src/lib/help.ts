import type { LucideIcon } from "lucide-react";
import {
  Sparkles,
  Home,
  PiggyBank,
  Wallet,
  History,
  Split,
  BarChart3,
  Scale,
  Target,
  Landmark,
  Settings,
} from "lucide-react";

/**
 * Help content: every feature and how to use it. Plain data so the Help page
 * and its search can both read it. Keep it in step with the app — when a feature
 * changes, change its entry here. Body text supports **bold** and `keys`
 * (rendered as <kbd>).
 */
export interface HelpItem {
  id: string;
  title: string;
  body: string[];
}

export interface HelpSection {
  id: string;
  title: string;
  icon: LucideIcon;
  intro: string;
  /** where the feature lives, for the "Open" button */
  href?: string;
  items: HelpItem[];
}

export const HELP: HelpSection[] = [
  {
    id: "start",
    title: "Getting started",
    icon: Sparkles,
    intro:
      "SmartBudget is a zero-based budget: you give every rupee a job, so what you can spend is what's actually sitting in your envelopes — not just what's in the bank. Add your accounts, then assign the money across budget categories until Ready to Assign reaches zero.",
    items: [
      {
        id: "idea",
        title: "The idea — Ready to Assign",
        body: [
          "Every rupee you own is either **assigned** to a budget category or still **Ready to Assign**. The goal each month is to assign it all down to **₹0**, so every category holds the money set aside for it.",
          "When you spend, the amount comes out of that category's available balance. If a category runs short, **move money** into it from another — you're always spending money you actually have.",
        ],
      },
      {
        id: "setup",
        title: "First-time setup",
        body: [
          "1. Add your **accounts** (bank accounts, credit cards, FDs, RDs) under **Accounts**, with their current balance.",
          "2. Build your **budget** under **Budget** — create groups and categories for your spending.",
          "3. **Assign** your Ready to Assign money across those categories until it reaches zero.",
          "4. Record spending as **transactions**, and reach for **Pay**, **Goals**, **Loans** and **Reports** as you need them.",
        ],
      },
      {
        id: "layout",
        title: "Finding your way around",
        body: [
          "On a computer, the **sidebar** on the left links to every screen and lists your accounts with live balances. On a phone, the **bottom bar** has Home, Budget, Accounts and History, with **More** for the rest.",
          "The big **+ Add** button (centre of the bottom bar, or top of the sidebar) adds a transaction, account, card or goal from anywhere.",
        ],
      },
      {
        id: "undo",
        title: "Undo and redo",
        body: [
          "Almost every change can be undone. Use the **undo**/**redo** arrows in the sidebar, or `Ctrl/⌘ + Z` to undo and `Ctrl/⌘ + Shift + Z` to redo.",
        ],
      },
      {
        id: "keyboard",
        title: "Keyboard mode",
        body: [
          "Press `Alt + Shift + K` for **keyboard mode** — a fast, full-screen way to enter lots of transactions with the keyboard alone. Press it again (or `Esc`) to leave.",
          "See **Keyboard shortcuts** at the bottom of this list for everything else.",
        ],
      },
      {
        id: "lock",
        title: "Locking the app",
        body: [
          "Your financial data is kept private behind your password. Use the **lock** button in the sidebar, or Settings → **Lock app**, to lock it whenever you step away.",
        ],
      },
    ],
  },
  {
    id: "home",
    title: "Home",
    icon: Home,
    href: "/",
    intro:
      "Your month at a glance — what's left to assign, where you stand, and what's happened lately.",
    items: [
      {
        id: "rta",
        title: "Ready to Assign",
        body: [
          "The headline number: money you still need to give a job. **Green/zero** means every rupee is assigned; a **positive** number means there's money to budget; a **negative** number means you've assigned more than you have — move some back.",
        ],
      },
      {
        id: "cards",
        title: "Net worth and this month",
        body: [
          "**Net worth** adds up every account. **This month** shows the money that's come in and gone out so far.",
        ],
      },
      {
        id: "overview",
        title: "Accounts, activity and trend",
        body: [
          "A quick strip of your **Accounts** with balances, your **Recent activity**, and an **Income vs expense** chart over the last 6 months. Tap anything to open it in full.",
        ],
      },
    ],
  },
  {
    id: "budget",
    title: "Budget",
    icon: PiggyBank,
    href: "/budget",
    intro:
      "Where you assign money to categories and keep each envelope topped up. Pick the month at the top.",
    items: [
      {
        id: "groups",
        title: "Groups and categories",
        body: [
          "Organise spending into **groups** (for example Bills, Living, Fun), each holding **categories** (Rent, Groceries, Dining). Add, rename, reorder or remove them right on the page.",
          "Each category shows **Assigned**, **Spent** and what's **Available** to spend right now.",
        ],
      },
      {
        id: "assign",
        title: "Assigning money",
        body: [
          "Tap a category's amount and type what to set aside for it this month. Keep going until **Ready to Assign** at the top reaches **₹0** — that's a fully assigned budget.",
          "Assignments carry forward: a category's Available balance rolls over month to month until you spend it.",
        ],
      },
      {
        id: "move",
        title: "Move money",
        body: [
          "When one category is short and another has spare, use **Move money** to shift the difference between them. Your total stays the same — you're just rebalancing envelopes.",
        ],
      },
    ],
  },
  {
    id: "accounts",
    title: "Accounts",
    icon: Wallet,
    href: "/accounts/",
    intro:
      "Every place your money lives — bank accounts, credit cards, fixed and recurring deposits — with your net worth on top.",
    items: [
      {
        id: "types",
        title: "Account types",
        body: [
          "**Accounts** and **Credit cards** are on-budget: their money is what you assign in the Budget. **Fixed Deposits** and **Recurring Deposits** are tracked for net worth but kept off-budget.",
          "Open an account to see its transactions and running balance; add transfers between accounts from the **+ Add** menu.",
        ],
      },
      {
        id: "manage",
        title: "Add, edit and close",
        body: [
          "Add an account from **+ Add → Account** (or **Card**), giving its name, bank, starting balance and — for UPI splitting — its **UPI id**. Edit or **close** an account you no longer use from its menu; closing hides it without deleting its history.",
        ],
      },
      {
        id: "upi",
        title: "UPI ids",
        body: [
          "Give a bank account its **UPI id** so SmartPay can build pay links and QR codes for it. Only accounts with a UPI id appear in the Pay split's **Paid by** and **People** lists.",
        ],
      },
    ],
  },
  {
    id: "history",
    title: "History",
    icon: History,
    href: "/history",
    intro: "Every transaction across all accounts, newest first.",
    items: [
      {
        id: "search",
        title: "Search and scan",
        body: [
          "Search by **payee, account, category or amount** to find any transaction. Tap one to edit its details, category, or split, or to delete it.",
        ],
      },
      {
        id: "splits",
        title: "Split transactions",
        body: [
          "A single transaction can be **split across categories** — handy when one shop receipt covers groceries and household items. Each leg counts against its own category's budget.",
        ],
      },
    ],
  },
  {
    id: "pay",
    title: "Pay (SmartPay)",
    icon: Split,
    href: "/pay",
    intro:
      "Split bills with family and friends, see who owes what, and settle instantly with UPI links and QR codes.",
    items: [
      {
        id: "newsplit",
        title: "New split",
        body: [
          "Enter the **total**, who **Paid by**, and the **People** sharing it — both lists show your UPI-linked bank accounts. Use **Split equally** or type each share; the form tells you when the shares balance.",
          "Saved splits track each person's share and whether they've **settled**.",
        ],
      },
      {
        id: "minimal",
        title: "Minimal transfers",
        body: [
          "SmartPay works out the **fewest payments** that settle everyone up, so nobody sends more transfers than needed. Copy the matching **UPI pay links** in one tap, or show a **QR code** to pay on the spot.",
        ],
      },
      {
        id: "summary",
        title: "Weekly summary",
        body: [
          "Copy a tidy **weekly summary** of who pays whom and outstanding shares, ready to paste into WhatsApp.",
        ],
      },
    ],
  },
  {
    id: "reports",
    title: "Reports",
    icon: BarChart3,
    href: "/reports",
    intro: "See where your money goes, month by month.",
    items: [
      {
        id: "charts",
        title: "What's here",
        body: [
          "**Income vs Expense vs Investment** for the month, a **Net worth trend** of each month's closing balance, **Spending by category**, and **Account balances** by group. Change the month to compare periods.",
        ],
      },
    ],
  },
  {
    id: "reconciliation",
    title: "Reconciliation",
    icon: Scale,
    href: "/reconciliation",
    intro:
      "Check that the money in a set of accounts matches the budget groups meant to hold it. Every mapping should net to zero.",
    items: [
      {
        id: "how",
        title: "How it reads",
        body: [
          "Each row shows the mapped **accounts** and their total on the left, the mapped **budget groups** and their total in the middle, and the **difference** on the right. **₹0** (green) means they match; anything else (red) means money is unaccounted for.",
        ],
      },
      {
        id: "mapping",
        title: "Setting up mappings",
        body: [
          "Go to **Settings → Reconciliation** to create mappings. Give each a name, then tap the **chips** to pick which accounts and which budget groups belong together. Accounts and groups appear in the same order as their own screens.",
          "A common setup is one mapping per person or goal — their accounts on one side, the budget groups funded from them on the other.",
        ],
      },
    ],
  },
  {
    id: "goals",
    title: "Goals",
    icon: Target,
    href: "/goals",
    intro: "Save towards the things that matter and watch each goal fill up.",
    items: [
      {
        id: "create",
        title: "Create and fund a goal",
        body: [
          "Add a goal with a **target amount** and an optional **target date**, then add money to it as you save. A progress bar shows how close you are.",
        ],
      },
    ],
  },
  {
    id: "loans",
    title: "Loans",
    icon: Landmark,
    href: "/loans",
    intro: "Keep track of what you owe.",
    items: [
      {
        id: "track",
        title: "Track a loan",
        body: [
          "Record each loan with its **lender**, the amount **borrowed**, the amount still **outstanding** and its **interest rate**, so your debts sit alongside your net worth.",
        ],
      },
    ],
  },
  {
    id: "settings",
    title: "Settings",
    icon: Settings,
    href: "/settings",
    intro: "Make SmartBudget yours, manage who shares it, and keep your data safe.",
    items: [
      {
        id: "appearance",
        title: "Appearance",
        body: [
          "Choose **Light**, **Dark** or **System** mode and a **theme colour**. Changes apply instantly.",
        ],
      },
      {
        id: "security",
        title: "Security",
        body: [
          "Change your **password** and choose whether to stay signed in on this device. Use **Lock app** to lock immediately.",
        ],
      },
      {
        id: "households",
        title: "Households",
        body: [
          "Share a budget with family: create or join a **household** with an invite code, and manage its members. Switch between households you belong to.",
        ],
      },
      {
        id: "payees",
        title: "Payees and payment links",
        body: [
          "Save **payees** you pay often, each with a UPI id, and set the **payment link** address used when you share a pay link.",
        ],
      },
      {
        id: "reconciliation",
        title: "Reconciliation mappings",
        body: [
          "Build the account ↔ budget-group mappings that power the **Reconciliation** screen. See the Reconciliation help for how they read.",
        ],
      },
      {
        id: "backups",
        title: "Backups",
        body: [
          "SmartBudget backs your data up automatically on a schedule you choose, and you can **restore** an older version, or **export/import** a backup file at any time.",
        ],
      },
      {
        id: "update",
        title: "Software update",
        body: [
          "When a new version is ready, **Software update** shows a dot and lets you update in one tap. A backup is taken first.",
        ],
      },
      {
        id: "profile",
        title: "Your profile",
        body: ["Set your **name** and **photo** from the account card at the top of Settings."],
      },
    ],
  },
];

/** Keyboard shortcuts, shown in their own Help section. */
export const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: "Shift + L", action: "Add transaction" },
  { keys: "Ctrl/⌘ + Z", action: "Undo last change" },
  { keys: "Ctrl/⌘ + Shift + Z", action: "Redo change" },
  { keys: "Ctrl/⌘ + Shift + A", action: "Add account" },
  { keys: "Ctrl/⌘ + Shift + C", action: "Add credit card" },
  { keys: "Ctrl/⌘ + Shift + G", action: "Add goal" },
  { keys: "Alt + Shift + K", action: "Toggle keyboard mode" },
  { keys: "Esc", action: "Close any popup" },
];

/** Every topic as a flat list, for search. */
export const HELP_TOPICS = HELP.flatMap((s) =>
  s.items.map((i) => ({
    section: s,
    item: i,
    text: `${s.title} ${i.title} ${i.body.join(" ")}`.replace(/[*`]/g, "").toLowerCase(),
  })),
);

export function searchHelp(q: string) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return HELP_TOPICS.filter((t) => words.every((w) => t.text.includes(w)));
}
