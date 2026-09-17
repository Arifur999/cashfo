// Bangla translations for: /reports/* (Overview, General Ledger, Trial
// Balance, Aging Receivable, Aging Payable) and their components under
// src/components/reports/.
export const reportsDictionary: Record<string, string> = {
  // AgingReportPageClient.tsx (page titles come from
  // app/(dashboard)/reports/aging-{receivable,payable}/page.tsx's literal
  // `title` prop)
  "Accounts Receivable Aging": "প্রাপ্য হিসাবের বকেয়া বিশ্লেষণ",
  "Accounts Payable Aging": "প্রদেয় হিসাবের বকেয়া বিশ্লেষণ",
  "Outstanding balances grouped by how overdue they are.": "মেয়াদোত্তীর্ণের ভিত্তিতে গ্রুপ করা বকেয়া ব্যালেন্স।",
  "Current (not yet due)": "চলতি (এখনও মেয়াদ শেষ হয়নি)",
  "1-30 Days Overdue": "১-৩০ দিন বকেয়া",
  "31-60 Days Overdue": "৩১-৬০ দিন বকেয়া",
  "60+ Days Overdue": "৬০+ দিন বকেয়া",
  "Nothing in this bucket.": "এই বিভাগে কিছু নেই।",

  // CategoryDonutCard.tsx
  "Income by Category": "ক্যাটাগরি অনুযায়ী আয়",
  "Expense by Category": "ক্যাটাগরি অনুযায়ী ব্যয়",
  "Total Income": "মোট আয়",
  "Total Expenses": "মোট ব্যয়",
  "No activity in this range.": "এই সময়সীমায় কোনো কার্যক্রম নেই।",

  // GeneralLedgerPageClient.tsx (heading "General Ledger" reuses
  // chrome.ts's own key -- do not redefine it here)
  "Every account in this workspace, grouped by type. Click one for its full statement.":
    "এই ওয়ার্কস্পেসের সকল হিসাব, ধরন অনুযায়ী গ্রুপ করা। সম্পূর্ণ বিবরণীর জন্য যেকোনো একটিতে ক্লিক করুন।",
  "account(s)": "টি হিসাব",
  "No accounts.": "কোনো হিসাব নেই।",

  // ACCOUNT_TYPE_LABELS (src/lib/accountDisplay.ts), rendered via t() at the
  // call site in both GeneralLedgerPageClient.tsx and
  // TrialBalancePageClient.tsx -- ACCOUNT_TYPE_LABELS.INCOME is "Income",
  // already covered by shared.ts, so no entry needed for it here.
  Assets: "সম্পদ",
  Liabilities: "দায়",
  Equity: "ইকুইটি",
  Expenses: "ব্যয়",

  // IncomeVsSavingsChart.tsx ("Income" legend/tooltip label reuses
  // shared.ts's own key)
  "Income vs Savings": "আয় বনাম সঞ্চয়",
  Savings: "সঞ্চয়",
  "No data yet.": "এখনও কোনো তথ্য নেই।",

  // ReportsOverviewPageClient.tsx
  "This Month": "এই মাস",
  "Last Month": "গত মাস",
  "This Year": "এই বছর",
  "All Time": "সর্বসময়",
  Custom: "কাস্টম",
  "Financial Reports": "আর্থিক প্রতিবেদন",
  "Analyze your financial data and trends.": "আপনার আর্থিক তথ্য ও প্রবণতা বিশ্লেষণ করুন।",
  to: "পর্যন্ত",

  // TrialBalancePageClient.tsx (heading "Trial Balance" reuses chrome.ts's
  // own key; "Total" reuses shared.ts's own key)
  "Every account's closing balance, split by its normal Debit or Credit side.":
    "প্রতিটি হিসাবের সমাপনী ব্যালেন্স, এর স্বাভাবিক ডেবিট বা ক্রেডিট পক্ষ অনুযায়ী বিভক্ত।",
  "Data integrity warning:": "ডেটা সঠিকতা সতর্কতা:",
  "total debits": "মোট ডেবিট",
  "do not equal total credits": "মোট ক্রেডিটের সমান নয়",
  "This should never happen -- contact support.": "এটি কখনও ঘটার কথা নয় -- সহায়তার সাথে যোগাযোগ করুন।",
  Debit: "ডেবিট",
  Credit: "ক্রেডিট",
  Subtotal: "উপমোট",
};
