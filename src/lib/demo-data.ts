/**
 * Demo data for trying the app out in development.
 *
 * loadDemoData() replaces the current home's accounts, categories, payees,
 * transactions, budgets, goals, splits, loans and reconciliation links with a
 * realistic ~3 months of household activity (dates are relative to today).
 * Settings and household membership are left untouched. Undo reverts it.
 *
 * In the dev server, run in the browser console:
 *   (await import("/src/lib/demo-data.ts")).loadDemoData()
 */
import { mutate, type DB, type Transaction } from "./store";
import { monthKey } from "./format";

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Day `day` of the month `back` months ago (clamped to month length). */
function dayOf(back: number, day: number): Date {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() - back, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(day, last));
}

export function buildDemoDB(): Pick<
  DB,
  | "accounts"
  | "categoryGroups"
  | "categories"
  | "payees"
  | "transactions"
  | "monthlyBudgets"
  | "goals"
  | "splits"
  | "loans"
  | "reconLinks"
> {
  const today = new Date();
  const todayISO = iso(today);
  let n = 0;
  const id = (p: string) => `demo-${p}-${(++n).toString(36)}`;

  /* ---------- accounts ---------- */
  const hdfc = id("acc");
  const sbi = id("acc");
  const cash = id("acc");
  const amazonCard = id("acc");
  const millennia = id("acc");
  const fd = id("acc");
  const rd = id("acc");
  const nextYear = new Date(today.getFullYear() + 1, today.getMonth(), 15);
  const in8Months = new Date(today.getFullYear(), today.getMonth() + 8, 5);

  const accounts: DB["accounts"] = [
    {
      id: hdfc,
      name: "HDFC Savings",
      type: "account",
      bank: "HDFC",
      upiVpa: "me@hdfcbank",
      onBudget: true,
      closed: false,
      sortOrder: 0,
      startingBalance: 48500,
    },
    {
      id: sbi,
      name: "SBI Salary",
      type: "account",
      bank: "SBI",
      upiVpa: "me@sbi",
      onBudget: true,
      closed: false,
      sortOrder: 1,
      startingBalance: 22000,
    },
    {
      id: cash,
      name: "Cash wallet",
      type: "account",
      bank: "Other",
      onBudget: true,
      closed: false,
      sortOrder: 2,
      startingBalance: 3500,
    },
    {
      id: amazonCard,
      name: "Amazon Pay ICICI",
      type: "credit",
      bank: "ICICI",
      brand: "visa",
      creditLimit: 150000,
      billingDate: 18,
      dueDate: 5,
      onBudget: true,
      closed: false,
      sortOrder: 3,
      startingBalance: 0,
    },
    {
      id: millennia,
      name: "HDFC Millennia",
      type: "credit",
      bank: "HDFC",
      brand: "mastercard",
      creditLimit: 100000,
      billingDate: 22,
      dueDate: 10,
      onBudget: true,
      closed: false,
      sortOrder: 4,
      startingBalance: 0,
    },
    {
      id: fd,
      name: "SBI Fixed Deposit",
      type: "fd",
      bank: "SBI",
      maturityDate: iso(nextYear),
      rateOfInterest: 7.1,
      onBudget: false,
      closed: false,
      sortOrder: 5,
      startingBalance: 200000,
    },
    {
      id: rd,
      name: "Axis Recurring Deposit",
      type: "rd",
      bank: "Axis",
      maturityDate: iso(in8Months),
      rateOfInterest: 6.7,
      onBudget: false,
      closed: false,
      sortOrder: 6,
      startingBalance: 36000,
    },
  ];

  /* ---------- categories ---------- */
  const groupDefs: [string, string[]][] = [
    ["Bills", ["Rent", "Electricity", "Internet", "Mobile recharge"]],
    ["Everyday", ["Groceries", "Dining out", "Transport", "Fuel"]],
    ["Lifestyle", ["Shopping", "Entertainment", "Subscriptions", "Health"]],
    ["Savings", ["Emergency fund", "Goa trip", "New laptop"]],
  ];
  const categoryGroups: DB["categoryGroups"] = [];
  const categories: DB["categories"] = [];
  const cat: Record<string, string> = {};
  groupDefs.forEach(([gName, names], gi) => {
    const gid = id("grp");
    categoryGroups.push({ id: gid, name: gName, sortOrder: gi, hidden: false });
    names.forEach((name, ci) => {
      const cid = id("cat");
      cat[name] = cid;
      categories.push({ id: cid, groupId: gid, name, sortOrder: ci, hidden: false });
    });
  });

  /* ---------- payees ---------- */
  const payeeDefs: [string, string?][] = [
    ["Landlord – Mr. Sharma", "sharma.rent@okicici"],
    ["BigBasket"],
    ["DMart"],
    ["Zepto"],
    ["Swiggy"],
    ["Zomato"],
    ["Uber"],
    ["Namma Metro"],
    ["Indian Oil"],
    ["Amazon"],
    ["Myntra"],
    ["Netflix"],
    ["Spotify"],
    ["Apollo Pharmacy"],
    ["BESCOM"],
    ["Airtel"],
    ["Jio"],
    ["PVR Cinemas"],
    ["Acme Technologies"],
    ["Rahul", "rahul@okaxis"],
    ["Priya", "priya@oksbi"],
    ["Ankit", "ankit@ybl"],
  ];
  const payees: DB["payees"] = payeeDefs.map(([name, upiVpa], i) => ({
    id: id("pay"),
    name,
    upiVpa,
    sortOrder: i,
  }));

  /* ---------- transactions ---------- */
  const transactions: Transaction[] = [];
  const add = (
    back: number,
    day: number,
    accountId: string,
    amount: number,
    payeeName: string,
    category?: string,
    extra: Partial<Transaction> = {},
  ) => {
    const date = iso(dayOf(back, day));
    if (date > todayISO) return;
    transactions.push({
      id: id("txn"),
      accountId,
      amount,
      date,
      payeeName,
      categoryId: category ? cat[category] : undefined,
      source: "demo",
      ...extra,
    });
  };
  const transfer = (
    back: number,
    day: number,
    from: string,
    to: string,
    amount: number,
    memo: string,
  ) => {
    const date = iso(dayOf(back, day));
    if (date > todayISO) return;
    const transferId = id("xfer");
    transactions.push(
      { id: id("txn"), accountId: from, amount: -amount, date, memo, transferId, source: "demo" },
      { id: id("txn"), accountId: to, amount, date, memo, transferId, source: "demo" },
    );
  };

  for (let back = 2; back >= 0; back--) {
    const wobble = (base: number, pct = 0.15) =>
      Math.round(base * (1 + (((back * 37 + base) % 7) / 7 - 0.5) * pct * 2));

    // Income
    add(back, 1, sbi, 92000, "Acme Technologies", undefined, { memo: "Salary" });
    if (back === 1)
      add(back, 20, hdfc, 6500, "Rahul", undefined, { memo: "Freelance design work" });

    // Moving money around
    transfer(back, 2, sbi, hdfc, 60000, "Monthly sweep to HDFC");
    transfer(back, 7, sbi, rd, 6000, "RD instalment");
    transfer(back, 4, hdfc, cash, 3000, "ATM withdrawal");

    // Bills
    add(back, 3, hdfc, -22000, "Landlord – Mr. Sharma", "Rent", { memo: "Monthly rent" });
    add(back, 9, hdfc, -wobble(1850), "BESCOM", "Electricity");
    add(back, 11, millennia, -999, "Airtel", "Internet", { memo: "Xstream fiber" });
    add(back, 14, amazonCard, -399, "Jio", "Mobile recharge");

    // Everyday
    add(back, 2, amazonCard, -wobble(2480), "BigBasket", "Groceries");
    add(back, 9, amazonCard, -wobble(1320), "Zepto", "Groceries");
    add(back, 16, millennia, -wobble(3150), "DMart", "Groceries", { memo: "Monthly stock-up" });
    add(back, 23, amazonCard, -wobble(890), "Zepto", "Groceries");
    add(back, 5, millennia, -wobble(640), "Swiggy", "Dining out");
    add(back, 12, millennia, -wobble(1180), "Zomato", "Dining out", { memo: "Friday dinner" });
    add(back, 19, cash, -wobble(450), "Chai Point", "Dining out");
    add(back, 26, millennia, -wobble(2350), "Toit", "Dining out", { memo: "Team dinner" });
    add(back, 6, hdfc, -wobble(310), "Uber", "Transport");
    add(back, 13, cash, -200, "Namma Metro", "Transport", { memo: "Metro card top-up" });
    add(back, 21, hdfc, -wobble(420), "Uber", "Transport");
    add(back, 10, millennia, -wobble(2600), "Indian Oil", "Fuel");
    add(back, 25, millennia, -wobble(2400), "Indian Oil", "Fuel");

    // Lifestyle
    add(back, 8, amazonCard, -wobble(1899), "Amazon", "Shopping");
    if (back !== 1)
      add(back, 17, millennia, -wobble(3499), "Myntra", "Shopping", { memo: "Winter jacket" });
    add(back, 15, millennia, -649, "Netflix", "Subscriptions");
    add(back, 15, millennia, -119, "Spotify", "Subscriptions");
    if (back !== 2) add(back, 18, hdfc, -wobble(780), "PVR Cinemas", "Entertainment");
    add(back, 22, cash, -wobble(540), "Apollo Pharmacy", "Health");

    // Paying off cards (previous month's spend)
    if (back < 2) {
      transfer(back, 5, hdfc, amazonCard, 7800, "Amazon Pay ICICI bill");
      transfer(back, 10, hdfc, millennia, 15400, "Millennia bill");
    }
  }

  // A split-category bill and a couple of pending items this month
  add(0, 3, amazonCard, -4200, "Amazon", undefined, {
    memo: "Household order",
    splits: [
      { categoryId: cat["Groceries"], amount: -1700 },
      { categoryId: cat["Shopping"], amount: -2500 },
    ],
  });
  add(0, Math.max(1, today.getDate() - 1), millennia, -3600, "Toit", "Dining out", {
    memo: "Birthday dinner – split with friends",
    pending: true,
  });
  add(0, today.getDate(), hdfc, -1499, "Amazon", "Shopping", {
    memo: "Awaiting refund",
    pending: true,
  });

  /* ---------- budgets (current + 2 previous months) ---------- */
  const plan: Record<string, number> = {
    Rent: 22000,
    Electricity: 2000,
    Internet: 1000,
    "Mobile recharge": 400,
    Groceries: 9000,
    "Dining out": 5000,
    Transport: 1500,
    Fuel: 5000,
    Shopping: 6000,
    Entertainment: 1500,
    Subscriptions: 800,
    Health: 1000,
    "Emergency fund": 10000,
    "Goa trip": 5000,
    "New laptop": 4000,
  };
  const monthlyBudgets: DB["monthlyBudgets"] = [];
  for (let back = 2; back >= 0; back--) {
    const month = monthKey(dayOf(back, 1));
    for (const [name, budgeted] of Object.entries(plan)) {
      monthlyBudgets.push({ id: id("bud"), categoryId: cat[name], month, budgeted });
    }
  }

  /* ---------- goals, splits, loans ---------- */
  const goals: DB["goals"] = [
    {
      id: id("goal"),
      name: "Goa trip",
      targetAmount: 40000,
      targetDate: iso(new Date(today.getFullYear(), today.getMonth() + 3, 20)),
      categoryId: cat["Goa trip"],
      saved: 15000,
    },
    {
      id: id("goal"),
      name: "Emergency fund",
      targetAmount: 300000,
      categoryId: cat["Emergency fund"],
      saved: 120000,
    },
    {
      id: id("goal"),
      name: "New laptop",
      targetAmount: 120000,
      targetDate: iso(new Date(today.getFullYear(), today.getMonth() + 6, 1)),
      categoryId: cat["New laptop"],
      saved: 32000,
    },
  ];

  const splits: DB["splits"] = [
    {
      id: id("split"),
      total: 3600,
      payerName: "Me",
      note: "Birthday dinner at Toit",
      date: iso(dayOf(0, Math.max(1, today.getDate() - 1))),
      shares: [
        { id: id("share"), payeeName: "Me", share: 1200, settled: true },
        {
          id: id("share"),
          payeeName: "Rahul",
          upiVpa: "rahul@okaxis",
          share: 1200,
          settled: false,
        },
        { id: id("share"), payeeName: "Priya", upiVpa: "priya@oksbi", share: 1200, settled: true },
      ],
    },
    {
      id: id("split"),
      total: 2400,
      payerName: "Ankit",
      note: "Movie + snacks",
      date: iso(dayOf(1, 18)),
      shares: [
        { id: id("share"), payeeName: "Ankit", upiVpa: "ankit@ybl", share: 800, settled: true },
        { id: id("share"), payeeName: "Me", share: 800, settled: false },
        { id: id("share"), payeeName: "Priya", upiVpa: "priya@oksbi", share: 800, settled: false },
      ],
    },
  ];

  const loans: DB["loans"] = [
    {
      id: id("loan"),
      name: "Car loan",
      lender: "HDFC",
      principal: 600000,
      outstanding: 412000,
      rateOfInterest: 8.9,
    },
  ];

  const reconLinks: DB["reconLinks"] = [
    {
      id: id("recon"),
      label: "Everyday money",
      accountIds: [hdfc, sbi, cash, amazonCard, millennia],
      groupIds: categoryGroups.map((g) => g.id),
    },
  ];

  transactions.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return {
    accounts,
    categoryGroups,
    categories,
    payees,
    transactions,
    monthlyBudgets,
    goals,
    splits,
    loans,
    reconLinks,
  };
}

/** Replace the current home's budget data with demo data (undoable). */
export function loadDemoData() {
  const demo = buildDemoDB();
  mutate((d) => Object.assign(d, demo));
  return {
    accounts: demo.accounts.length,
    categories: demo.categories.length,
    transactions: demo.transactions.length,
  };
}
