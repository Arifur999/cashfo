// Bangla translations for: /balance/* (Overview, Balance Transfer, Ledger,
// Wallet), /accounts and /accounts/[id], and their components under
// src/components/balance/ and src/components/accounts/.
export const balanceDictionary: Record<string, string> = {
  // src/app/(dashboard)/balance/overview/page.tsx -- "Total Accounts"/"Total
  // Balance"/"Inactive Amount"/"Available Balance"/"Account Details"/
  // "Opening"/"Total In"/"Total Out" reuse dictionary/savings-goals.ts's
  // identical keys; "Account"/"Current Balance"/"Inactive"/"Total" reuse
  // shared.ts's keys; "Savings" reuses reports.ts's key.
  "Balance Overview": "ব্যালেন্স ওভারভিউ",
  "Account Balance Overview": "হিসাবের ব্যালেন্স ওভারভিউ",
  "No money accounts yet.": "এখনো কোনো মানি হিসাব নেই।",
  Adjustment: "সমন্বয়",

  // src/components/balance/BalanceTransferPageClient.tsx -- "Balance
  // Transfer" reuses chrome.ts's key, "New Transfer" reuses
  // savings-goals.ts's key, "Print" reuses loan-management.ts's key, "No
  // transfers yet." reuses savings-goals.ts's key, "Enter a reason (min 5
  // characters)"/"Reason must be at least 5 characters"/"Void" reuse
  // loan-management.ts's keys, "From"/"To"/"Voided" reuse
  // income-expense.ts's keys, "View"/"Date"/"Amount"/"Notes"/"Actions" reuse
  // shared.ts's keys.
  "Account Balance Transfer": "হিসাবের ব্যালেন্স ট্রান্সফার",
  "Total Transfer": "মোট ট্রান্সফার",
  "Total Transactions": "মোট লেনদেন",
  "Total balance remains unchanged on transfer. Only moves between accounts.":
    "স্থানান্তরের পর মোট ব্যালেন্স অপরিবর্তিত থাকে। শুধু হিসাবের মধ্যে স্থানান্তরিত হয়।",
  "Transfer List": "ট্রান্সফার তালিকা",
  "Void this transfer of": "এই ট্রান্সফারটি বাতিল করবেন",
  "Transfer voided": "ট্রান্সফার বাতিল হয়েছে",
  "Failed to void transfer": "ট্রান্সফার বাতিল করতে ব্যর্থ",

  // src/components/balance/AccountLedgerPageClient.tsx -- "Print / PDF"/
  // "Period"/"Closing Balance" reuse loan-management.ts's keys, "Select an
  // account" reuses income-expense.ts's key, "to"/"No activity in this
  // range." reuse reports.ts's keys, "No accounts yet" reuses assets.ts/
  // personal.ts's key, "Payment" reuses loan-management.ts's key, "Voided"
  // reuses income-expense.ts's key, "Opening Balance"/"Date"/"Type"/
  // "Description"/"Balance"/"Previous"/"Next" reuse shared.ts's keys, range
  // option labels ("All Time"/"This Month"/"Last Month"/"This Year"/
  // "Custom") reuse loan-management.ts/reports.ts's keys.
  "Account Ledger": "হিসাব লেজার",
  "One account, every movement through it, with the balance carried forward.":
    "একটি হিসাব, তার মধ্য দিয়ে যাওয়া প্রতিটি লেনদেন, এগিয়ে নেওয়া ব্যালেন্সসহ।",
  Clear: "সাফ করুন",
  "Choose an account to see its ledger.": "লেজার দেখতে একটি হিসাব নির্বাচন করুন।",
  Reference: "রেফারেন্স",
  In: "জমা",
  Out: "উত্তোলন",
  Page: "পৃষ্ঠা",
  Journal: "জার্নাল",
  "Sale (Credit)": "বিক্রয় (বাকিতে)",
  "Purchase (Credit)": "ক্রয় (বাকিতে)",

  // src/components/balance/WalletFormModal.tsx -- "Account Number"/"Wallet
  // Name"/"e.g. 01711223344" reuse savings-goals.ts's keys, "(optional)"
  // reuses loan-management.ts's key, "Opening Balance"/"Cancel"/"Save
  // Changes"/"Create" reuse shared.ts's keys.
  "e.g. Islami Bank": "যেমন, ইসলামী ব্যাংক",
  "Edit Wallet": "ওয়ালেট সম্পাদনা",
  "Add Wallet": "ওয়ালেট যোগ করুন",
  "Wallet updated": "ওয়ালেট আপডেট হয়েছে",
  "Wallet created": "ওয়ালেট তৈরি হয়েছে",
  "Failed to update wallet": "ওয়ালেট আপডেট করতে ব্যর্থ",
  "Failed to create wallet": "ওয়ালেট তৈরি করতে ব্যর্থ",

  // src/components/balance/WalletPageClient.tsx -- "Wallet" reuses
  // chrome.ts's key, "Add"/"Name"/"Opening Balance"/"Actions"/"Edit" reuse
  // shared.ts's keys, "Archive"/"Archived" reuse loan-management.ts's keys.
  Accounts: "হিসাবসমূহ",
  "No wallets yet.": "এখনো কোনো ওয়ালেট নেই।",
  "Wallet archived": "ওয়ালেট আর্কাইভ করা হয়েছে",
  "Failed to archive wallet": "ওয়ালেট আর্কাইভ করতে ব্যর্থ",

  // src/components/accounts/AccountDetailPageClient.tsx --
  // ACCOUNT_TYPE_LABELS (Assets/Liabilities/Equity/Expenses) reuse
  // reports.ts's keys, Income reuses shared.ts's key; "Total In"/"Total Out"
  // reuse savings-goals.ts's keys; "Transactions" reuses chrome.ts's key;
  // "to" reuses reports.ts's key; "Balance brought forward"/"Closing
  // Balance" reuse loan-management.ts's keys; "Date"/"Description"/
  // "Balance"/"Previous"/"Next" reuse shared.ts's keys; "No activity in this
  // range." reuses reports.ts's key.
  "Back to Chart of Accounts": "হিসাবচিত্রে ফিরে যান",
  "Money In": "জমা",
  "Money Out": "উত্তোলন",
  "All time": "সর্বসময়",

  // src/components/accounts/AccountFormModal.tsx -- "Name"/"Cancel"/"Save
  // Changes"/"Create" reuse shared.ts's keys, "(optional)" reuses
  // loan-management.ts's key.
  "Edit Account": "হিসাব সম্পাদনা",
  "Add Account": "হিসাব যোগ করুন",
  "e.g. Petty Cash": "যেমন, খুচরা নগদ",
  "Bangla Name": "বাংলা নাম",
  "Account Type": "হিসাবের ধরন",
  "Account type can't be changed after creation": "তৈরি করার পর হিসাবের ধরন পরিবর্তন করা যায় না",
  Subtype: "সাবটাইপ",
  "e.g. bank": "যেমন, ব্যাংক",
  "Parent Account": "মূল হিসাব",
  "None (top-level)": "কোনোটি নয় (শীর্ষ স্তর)",
  "Account updated": "হিসাব আপডেট হয়েছে",
  "Account created": "হিসাব তৈরি হয়েছে",
  "Failed to update account": "হিসাব আপডেট করতে ব্যর্থ",
  "Failed to create account": "হিসাব তৈরি করতে ব্যর্থ",

  // src/components/accounts/AccountsPageClient.tsx -- "Add"/"Edit" reuse
  // shared.ts's keys, "Archive"/"Archived" reuse loan-management.ts's keys,
  // "account(s)" reuses reports.ts's key, "Default" reuses
  // settings-workspace.ts's key, ACCOUNT_TYPE_LABELS reuse reports.ts's/
  // shared.ts's keys.
  "Chart of Accounts": "হিসাবচিত্র",
  "All accounts for this workspace, grouped by type.": "এই ওয়ার্কস্পেসের সকল হিসাব, ধরন অনুযায়ী গ্রুপ করা।",
  "No accounts yet.": "এখনো কোনো হিসাব নেই।",
  "Account archived": "হিসাব আর্কাইভ করা হয়েছে",
  "Failed to archive account": "হিসাব আর্কাইভ করতে ব্যর্থ",
};
