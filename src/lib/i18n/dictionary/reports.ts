// Bangla translations for Insights (/reports/overview: What your numbers
// say, and /reports/detailed: Reports) and their components under
// components/modules/Customer/Insights, plus a few report keys other pages
// still use (CategoryDonutCard on a group's page, the account statement's
// range labels). Keys another dictionary already defines ("Insights",
// "What your numbers say", "This month", "Last month", "This year",
// "Wallets", "Assets", "Savings goals", "Owed to you", "You owe",
// "Income", "Expense", "Category", "Total", "Share", "Both", "Yes",
// "All wallets", "Budget", "Income sources", "Change", "Income and what
// you kept", "Last 6 months", "Savings rate", "You kept", "is", "in",
// "to", "new", "brought", "across", "contact", "contacts", "this month",
// "last month") are not repeated.
export const reportsDictionary: Record<string, string> = {
  // Periods (INSIGHT_PERIOD_LABELS, REPORT_PERIOD_LABELS, PERIOD_PHRASE)
  "Last 3 months": "গত ৩ মাস",
  "Last year": "গত বছর",
  "over the last 3 months": "গত ৩ মাসে",
  "this year": "এই বছর",
  Period: "সময়কাল",
  "compared with": "তুলনায়",
  "the same months of": "একই মাসগুলো,",
  against: "বনাম",
  vs: "বনাম",

  // Insights overview (InsightsOverviewPageClient.tsx)
  "Detailed reports": "বিস্তারিত রিপোর্ট",
  "Nothing to read yet": "এখনো পড়ার কিছু নেই",
  "Go to transactions": "লেনদেনে যান",
  "The short version": "সংক্ষেপে",
  "is more than": "আপনার আয়ের",
  "of your income.": "শতাংশের বেশি।",
  "of your income": "আপনার আয়ের",
  "No money in yet.": "এখনো কোনো আয় নেই।",
  "Record an income and this fills in.": "একটি আয় লিখুন, এটি ভরে যাবে।",
  "of what you earned.": "রেখেছেন যা আয় করেছেন তার।",
  "Nothing earned yet.": "এখনো কোনো আয় হয়নি।",
  "That is": "অর্থাৎ",
  "up from": "বেড়েছে, আগে ছিল",
  "down from": "কমেছে, আগে ছিল",
  "Once money comes in, this shows the share you kept.": "আয় আসলে এখানে দেখা যাবে কত ভাগ রেখেছেন।",
  "is your biggest spend.": "আপনার সবচেয়ে বড় খরচ।",
  "No spending recorded.": "কোনো খরচ লেখা নেই।",
  "of spending": "খরচের",
  "a month on average": "গড়ে প্রতি মাসে",
  "Your expenses show up here.": "আপনার খরচ এখানে দেখা যাবে।",
  Totals: "মোট হিসাব",
  "Money in": "আয়",
  "Money out": "খরচ",
  "Left over": "বাকি",
  "Nothing before to compare with": "তুলনার মতো আগের কিছু নেই",
  up: "বেড়েছে",
  down: "কমেছে",
  point: "পয়েন্ট",
  points: "পয়েন্ট",
  "Where your money comes from": "আপনার টাকা কোথা থেকে আসে",
  "income source": "টি আয়ের উৎস",
  "income sources": "টি আয়ের উৎস",
  "No money came in": "কোনো আয় আসেনি",
  "It is your only source so far.": "এখন পর্যন্ত এটিই আপনার একমাত্র উৎস।",
  "went from": "ছিল",
  "Where it goes": "কোথায় যায়",
  category: "টি ক্যাটাগরি",
  categories: "টি ক্যাটাগরি",
  "Nothing went out": "কোনো খরচ হয়নি",
  "Spending split by category": "ক্যাটাগরি অনুযায়ী খরচের ভাগ",
  "fell by": "কমেছে",
  "rose by": "বেড়েছে",
  "What changed": "কী বদলেছে",
  "Clearing it would lift your net worth by the same amount.": "এটি শোধ করলে আপনার নিট সম্পদ ঠিক ততটাই বাড়বে।",
  "is owed to you.": "আপনার পাওনা।",
  "Collecting it would move that into your wallets.": "আদায় করলে সেটা আপনার ওয়ালেটে আসবে।",

  // Net worth (NetWorthCard.tsx)
  "Net worth today": "আজকের নিট সম্পদ",
  "Wallets, savings, assets and money owed to you, minus what you owe": "ওয়ালেট, সঞ্চয়, সম্পদ আর আপনার পাওনা, বাদ আপনার দেনা",
  "Everything you have and are owed, minus what you owe.": "আপনার যা আছে আর যা পাওনা, বাদ যা দেনা।",
  "Most of it sits in your wallets.": "এর বেশিরভাগ আপনার ওয়ালেটে।",
  "Most of it is your savings.": "এর বেশিরভাগ আপনার সঞ্চয়।",
  "Most of it is your assets.": "এর বেশিরভাগ আপনার সম্পদ।",
  "Most of it is money owed to you.": "এর বেশিরভাগ আপনার পাওনা টাকা।",
  "What you have": "আপনার যা আছে",
  "what you owe": "আপনার দেনা",
  "Green: what you have and are owed": "সবুজ: আপনার যা আছে ও পাওনা",
  "Red: what you owe": "লাল: আপনার দেনা",

  // Saving rate (SavingsRateChart.tsx) and the phone chart (KeptChart.tsx)
  "Am I saving more?": "আমি কি বেশি সঞ্চয় করছি?",
  "Share of income you kept, each month": "প্রতি মাসে আয়ের যত ভাগ রেখেছেন",
  "Share of income kept by month": "মাস অনুযায়ী আয়ের রাখা ভাগ",
  "Not yet": "এখনো না",
  "point since": "পয়েন্ট, শুরু",
  "points since": "পয়েন্ট, শুরু",
  "Income and what you kept, by month": "মাস অনুযায়ী আয় এবং যা রেখেছেন",
  kept: "রেখেছেন",
  Kept: "রেখেছেন",

  // Reports (ReportsPageClient.tsx)
  Reports: "রিপোর্ট",
  "Every category, month by month. Download it for your records or your tax file.": "প্রতিটি ক্যাটাগরি, মাসে মাসে। নিজের রেকর্ড বা ট্যাক্স ফাইলের জন্য ডাউনলোড করুন।",
  "Download PDF": "PDF ডাউনলোড",
  Wallet: "ওয়ালেট",
  Show: "দেখান",
  "Voided entries are left out": "বাতিল এন্ট্রি বাদ দেওয়া হয়েছে",
  "Income by category": "ক্যাটাগরি অনুযায়ী আয়",
  "Expense by category": "ক্যাটাগরি অনুযায়ী খরচ",
  "Income and expense by category": "ক্যাটাগরি অনুযায়ী আয় ও খরচ",
  "No income or expense in this period.": "এই সময়কালে কোনো আয় বা খরচ নেই।",

  // CategoryDonutCard.tsx, still used on a group's page
  "Income by Category": "ক্যাটাগরি অনুযায়ী আয়",
  "Expense by Category": "ক্যাটাগরি অনুযায়ী ব্যয়",
  "Total Income": "মোট আয়",
  "Total Expenses": "মোট ব্যয়",
  "No activity in this range.": "এই সময়সীমায় কোনো কার্যক্রম নেই।",

  // "account(s)" is rendered via t() by AccountsPageClient.tsx.
  "account(s)": "টি হিসাব",

  // ACCOUNT_TYPE_LABELS (src/lib/accountDisplay.ts), rendered via t() at the
  // call site in AccountsPageClient.tsx/AccountDetailPageClient.tsx --
  // ACCOUNT_TYPE_LABELS.INCOME is "Income", already covered by shared.ts.
  Assets: "সম্পদ",
  Liabilities: "দায়",
  Equity: "ইকুইটি",
  Expenses: "ব্যয়",

  // Range labels on the account statement and detail pages
  "This Month": "এই মাস",
  "Last Month": "গত মাস",
  "This Year": "এই বছর",
  "All Time": "সর্বসময়",
  Custom: "কাস্টম",
  to: "পর্যন্ত",

  // "Debit"/"Credit" are reused by JournalEntryForm.tsx and
  // transactions/[id]/page.tsx's ledger entry table.
  Debit: "ডেবিট",
  Credit: "ক্রেডিট",
};
