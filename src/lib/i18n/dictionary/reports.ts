// Bangla translations for: /reports/* (Overview -- General Ledger, Trial
// Balance, Aging Receivable, and Aging Payable were removed per the user's
// explicit request) and its components under src/components/reports/.
export const reportsDictionary: Record<string, string> = {
  // CategoryDonutCard.tsx
  "Income by Category": "ক্যাটাগরি অনুযায়ী আয়",
  "Expense by Category": "ক্যাটাগরি অনুযায়ী ব্যয়",
  "Total Income": "মোট আয়",
  "Total Expenses": "মোট ব্যয়",
  "No activity in this range.": "এই সময়সীমায় কোনো কার্যক্রম নেই।",

  // "account(s)" is rendered via t() by AccountsPageClient.tsx.
  "account(s)": "টি হিসাব",

  // ACCOUNT_TYPE_LABELS (src/lib/accountDisplay.ts), rendered via t() at the
  // call site in AccountsPageClient.tsx/AccountDetailPageClient.tsx --
  // ACCOUNT_TYPE_LABELS.INCOME is "Income", already covered by shared.ts,
  // so no entry needed for it here.
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

  // "Debit"/"Credit" are reused by JournalEntryForm.tsx and
  // transactions/[id]/page.tsx's ledger entry table.
  Debit: "ডেবিট",
  Credit: "ক্রেডিট",
};
