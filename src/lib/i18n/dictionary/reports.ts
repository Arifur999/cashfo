// Bangla translations for Insights (/reports/overview: What your numbers
// say, and /reports/detailed: Reports) and their components under
// components/modules/Customer/Insights, plus a few report keys other pages
// still use (the account statement's range labels, the account types).
// Keys another dictionary already defines ("Insights", "Overview", "What
// your numbers say", "This month", "Last month", "This year", "Wallets",
// "Savings goals", "Owed to you", "Income", "Category", "Total",
// "Share", "Both", "All wallets", "Budget", "Income sources", "Income and
// what you kept", "Last 6 months", "Savings rate", "Month", "Loading",
// "Print / PDF", "Try again", "new", "this month", "last month") are not
// repeated.
//
// Every sentence is one key with {placeholders}, in the reader's word
// order. "{period}" is one of the phrases under Periods ("this month",
// "over the last 3 months"); "{previous}" a stretch of days ("1–21
// September", "1 January – 21 October 2025").
export const reportsDictionary: Record<string, string> = {
  // Periods (INSIGHT_PERIOD_LABELS, REPORT_PERIOD_LABELS, PERIOD_PHRASE).
  // July to June is the income year (আয়বর্ষ), as the tax return says; its
  // tax year (করবর্ষ) is the one after.
  "Last 3 months": "গত ৩ মাস",
  "Last year": "গত বছর",
  "This income year ({span})": "চলতি আয়বর্ষ ({span})",
  "Last income year ({span})": "গত আয়বর্ষ ({span})",
  "over the last 3 months": "গত ৩ মাসে",
  "this year": "এই বছর",
  Period: "সময়কাল",
  "3 months": "৩ মাস",

  // Insights overview (InsightsOverviewPageClient.tsx)
  "{period}, compared with {previous}.": "{period}, {previous}-এর তুলনায়।",
  "Detailed reports": "বিস্তারিত রিপোর্ট",
  "Nothing to read yet": "এখনো পড়ার কিছু নেই",
  "Go to transactions": "লেনদেনে যান",
  "The short version": "সংক্ষেপে",
  "{name} is {percent} of your income {period}.": "{period} আপনার আয়ের {percent} এসেছে {name} থেকে।",
  "{name} brought {amount}.": "{name} থেকে এসেছে {amount}।",
  "{name} went from {before} to {now}.": "{name} {before} থেকে {now} হয়েছে।",
  "It is your only source so far.": "এখন পর্যন্ত এটিই আপনার একমাত্র উৎস।",
  "{percent} of your income comes from {name} alone.": "আপনার আয়ের {percent} আসে শুধু {name} থেকে।",
  "No money in yet.": "এখনো কোনো আয় নেই।",
  "Record an income and this fills in.": "একটি আয় লিখুন, এটি ভরে যাবে।",
  "You kept {percent} of what you earned.": "আয়ের {percent} আপনি রেখেছেন।",
  "That is {amount} {period}.": "অর্থাৎ {period} {amount}।",
  "That is {amount} {period}, up from {before} in {previous}.": "অর্থাৎ {period} {amount}। {previous}-এ রাখার হার ছিল {before}, এবার বেড়েছে।",
  "That is {amount} {period}, down from {before} in {previous}.": "অর্থাৎ {period} {amount}। {previous}-এ রাখার হার ছিল {before}, এবার কমেছে।",
  "That is {amount} {period}, the same share as in {previous}.": "অর্থাৎ {period} {amount}। {previous}-এও রাখার হার একই ছিল।",
  "You spent {amount} more than you earned.": "আয়ের চেয়ে {amount} বেশি খরচ করেছেন।",
  "{spent} went out against {earned} {period}.": "{period} আয় {earned}, খরচ {spent}।",
  "{spent} went out {period}.": "{period} খরচ হয়েছে {spent}।",
  "Nothing earned yet.": "এখনো কোনো আয় হয়নি।",
  "Once money comes in, this shows the share you kept.": "আয় আসলে এখানে দেখা যাবে কত ভাগ রেখেছেন।",
  "{name} is your biggest spend.": "{name} আপনার সবচেয়ে বড় খরচ।",
  "{percent} of spending · {amount} a month on average.": "খরচের {percent} · গড়ে মাসে {amount}।",
  "{percent} of spending, about {amount} a month.": "খরচের {percent}, মাসে প্রায় {amount}।",
  "{percent} of spending · {amount} so far.": "খরচের {percent} · এ পর্যন্ত {amount}।",
  "{percent} of spending · {amount} in all.": "খরচের {percent} · মোট {amount}।",
  "No spending recorded.": "কোনো খরচ লেখা নেই।",
  "Your expenses show up here.": "আপনার খরচ এখানে দেখা যাবে।",
  Totals: "মোট হিসাব",
  "Money in": "আয়",
  "Money out": "খরচ",
  "Left over": "বাকি",
  "{change} vs {previous}": "{previous}-এর তুলনায় {change}",
  "Nothing before to compare with": "তুলনার মতো আগের কিছু নেই",
  "{count} point": "{count} পয়েন্ট",
  "{count} points": "{count} পয়েন্ট",
  "Where your money comes from": "আপনার টাকা কোথা থেকে আসে",
  "{count} income source · {amount}": "{count}টি আয়ের উৎস · {amount}",
  "{count} income sources · {amount}": "{count}টি আয়ের উৎস · {amount}",
  "No money came in {period}.": "{period} কোনো আয় আসেনি।",
  "Where it goes": "কোথায় যায়",
  "{count} category · {amount}": "{count}টি ক্যাটাগরি · {amount}",
  "{count} categories · {amount}": "{count}টি ক্যাটাগরি · {amount}",
  "Nothing went out {period}.": "{period} কোনো খরচ হয়নি।",
  "Spending split by category": "ক্যাটাগরি অনুযায়ী খরচের ভাগ",
  "{name} fell by {amount} against {previous}.": "{previous}-এর তুলনায় {name}-এ খরচ {amount} কমেছে।",
  "{name} rose by {amount} against {previous}.": "{previous}-এর তুলনায় {name}-এ খরচ {amount} বেড়েছে।",
  "What changed": "কী বদলেছে",
  "{now} against {before}": "{now} বনাম {before}",
  // The changes table's column head: the group page's "Change" is a verb.
  "Change@@delta": "পরিবর্তন",

  // The loans note (LoansNote.tsx)
  "You owe {amount}.": "আপনার দেনা {amount}।",
  "You owe {amount} to {count} contact.": "{count} জনের কাছে আপনার দেনা {amount}।",
  "You owe {amount} to {count} contacts.": "{count} জনের কাছে আপনার দেনা {amount}।",
  "Clearing it would lift your net worth by the same amount.": "এটি শোধ করলে আপনার নিট সম্পদ ঠিক ততটাই বাড়বে।",
  "{amount} is owed to you.": "{amount} আপনার পাওনা।",
  "Collecting it would move that into your wallets.": "আদায় করলে সেটা আপনার ওয়ালেটে আসবে।",
  "See loans": "দেনা-পাওনা দেখুন",

  // Net worth (NetWorthCard.tsx, NetWorthBoundary.tsx)
  "Net worth today": "আজকের নিট সম্পদ",
  // A balance, not loans' "you will give" (আপনি দেবেন).
  "You owe@@networth": "আপনার দেনা",
  "Wallets, savings, assets and money owed to you, minus what you owe": "ওয়ালেট, সঞ্চয়, সম্পদ আর আপনার পাওনা, বাদ আপনার দেনা",
  "Everything you have and are owed, minus what you owe.": "আপনার যা আছে আর যা পাওনা, বাদ যা দেনা।",
  "Most of it sits in your wallets.": "এর বেশিরভাগ আপনার ওয়ালেটে।",
  "Most of it is your savings.": "এর বেশিরভাগ আপনার সঞ্চয়।",
  "Most of it is your assets.": "এর বেশিরভাগ আপনার সম্পদ।",
  "Most of it is money owed to you.": "এর বেশিরভাগ আপনার পাওনা টাকা।",
  "What you have {have}, what you owe {owe}": "আপনার যা আছে {have}, আপনার দেনা {owe}",
  "Green: what you have and are owed, {have} · Red: what you owe, {owe}": "সবুজ: আপনার যা আছে ও পাওনা, {have} · লাল: আপনার দেনা, {owe}",
  "Net worth couldn't load": "নিট সম্পদ লোড করা যায়নি",
  "The rest of the page is up to date. Try again in a moment.": "পেজের বাকি অংশ ঠিক আছে। একটু পরে আবার চেষ্টা করুন।",

  // Saving rate (SavingsRateChart.tsx) and the phone chart (KeptChart.tsx)
  "Am I saving more?": "আমি কি বেশি সঞ্চয় করছি?",
  "Share of income you kept, each month": "প্রতি মাসে আয়ের যত ভাগ রেখেছেন",
  "Share of income kept by month: {months}": "মাস অনুযায়ী আয়ের রাখা ভাগ: {months}",
  // The trend chip names the month it judges: "{latest}" is that month,
  // "{month}" the first one it is measured from.
  "{latest}: up {points} point since {month}": "{latest}: {month} থেকে {points} পয়েন্ট বেড়েছে",
  "{latest}: up {points} points since {month}": "{latest}: {month} থেকে {points} পয়েন্ট বেড়েছে",
  "{latest}: down {points} point since {month}": "{latest}: {month} থেকে {points} পয়েন্ট কমেছে",
  "{latest}: down {points} points since {month}": "{latest}: {month} থেকে {points} পয়েন্ট কমেছে",
  "{latest}: same as {month}": "{latest}: {month}-এর সমান",
  "Not yet": "এখনো না",
  "Income and what you kept, by month": "মাস অনুযায়ী আয় এবং যা রেখেছেন",
  "{month}: {income} in, {kept} kept": "{month}: আয় {income}, রেখেছেন {kept}",
  "{month}: {income} in, {over} more went out": "{month}: আয় {income}, আয়ের চেয়ে খরচ {over} বেশি",
  // The month under way, whose figures are only what it has come to yet.
  // admin-system.ts has "{month} so far" too, with the same Bangla.
  "{month} so far": "{month}, এ পর্যন্ত",
  "{month} so far: {income} in, {kept} kept": "{month}, এ পর্যন্ত: আয় {income}, রেখেছেন {kept}",
  "{month} so far: {income} in, {over} more went out": "{month}, এ পর্যন্ত: আয় {income}, আয়ের চেয়ে খরচ {over} বেশি",
  Kept: "রেখেছেন",
  Overspent: "বেশি খরচ",
  // Home's hero still says "vs {month}", and the Namaz sheet "up from …".
  vs: "বনাম",
  "up from": "বেড়েছে, আগে ছিল",
  "down from": "কমেছে, আগে ছিল",

  // Reports (ReportsPageClient.tsx)
  Reports: "রিপোর্ট",
  "Every category, month by month. Download it for your records or your tax file.": "প্রতিটি ক্যাটাগরি, মাসে মাসে। নিজের রেকর্ড বা ট্যাক্স ফাইলের জন্য ডাউনলোড করুন।",
  "Download CSV": "CSV ডাউনলোড করুন",
  "Nothing to download for this period": "এই সময়কালে ডাউনলোড করার কিছু নেই",
  Wallet: "ওয়ালেট",
  Show: "দেখান",
  // The Show switch: the table beside it says খরচ, not the shared ব্যয়.
  "Expense@@report": "খরচ",
  "Voided entries are left out": "বাতিল এন্ট্রি বাদ দেওয়া হয়েছে",
  // A phone's hint under the table's heading: the months sit past the edge.
  "Swipe sideways for each month": "প্রতি মাসের হিসাব দেখতে পাশে সরান",
  "Income by category": "ক্যাটাগরি অনুযায়ী আয়",
  "Expense by category": "ক্যাটাগরি অনুযায়ী খরচ",
  "Income and expense by category": "ক্যাটাগরি অনুযায়ী আয় ও খরচ",
  "No income or expense in this period.": "এই সময়কালে কোনো আয় বা খরচ নেই।",
  "No income in this period.": "এই সময়কালে কোনো আয় নেই।",
  "No expense in this period.": "এই সময়কালে কোনো খরচ নেই।",
  "Nothing went through {wallet} in this period.": "এই সময়কালে {wallet} দিয়ে কোনো লেনদেন হয়নি।",
  "No income went through {wallet} in this period.": "এই সময়কালে {wallet}-এ কোনো আয় আসেনি।",
  "No expense went through {wallet} in this period.": "এই সময়কালে {wallet} থেকে কোনো খরচ হয়নি।",
  "Show all wallets": "সব ওয়ালেট দেখুন",

  // CategoryDonutCard.tsx (since removed); kept until the key sweep.
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
