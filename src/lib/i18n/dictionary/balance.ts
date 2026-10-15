// Bangla translations for Money › Wallets (/balance/*: Balance, My
// wallets, Transfer, Statement), /accounts and /accounts/[id], and their
// components under components/modules/Customer/Balance and .../Accounts.
// Keys another dictionary already defines ("Money", "Wallets", "Transfer",
// "Statement", "Move money", "Cancel", "Edit", "Remove", "Archive",
// "Archived", "Opening", "Type", "Date", "Amount", "Note", "Voided", "View",
// "Balance", "Description", "Print", "Period", "Custom", "Close", "Preview",
// "Reason", the period names, "Previous page"/"Next page", "Showing", "of",
// "to", "View details", "Add wallet", "No wallet yet", "Ledger", "Total
// balance", "Money in"/"Money out", "Active", "Wallet") are not repeated.
export const balanceDictionary: Record<string, string> = {
  // The wallet kinds (lib/customer/walletVisuals.ts), by label and by key.
  Cash: "নগদ",
  "Bank account": "ব্যাংক হিসাব",
  "Mobile wallet": "মোবাইল ওয়ালেট",
  cash: "নগদ",
  bank: "ব্যাংক",
  mfs: "মোবাইল",

  // Balance (balance/overview/page.tsx)
  Opening: "প্রারম্ভিক",
  "Where your money sits right now, and how each account got there.": "আপনার টাকা এখন কোথায় আছে, আর প্রতিটি হিসাব কীভাবে সেখানে পৌঁছাল।",
  "Available balance": "ব্যবহারযোগ্য ব্যালেন্স",
  "in archived wallets": "আর্কাইভ করা ওয়ালেটে",
  Accounts: "হিসাবসমূহ",
  "Share of balance by wallet": "ওয়ালেট অনুযায়ী ব্যালেন্সের ভাগ",
  "Account details": "হিসাবের বিবরণ",
  "Click a row to open its ledger": "লেজার দেখতে সারিতে ক্লিক করুন",
  "Add your cash, bank and mobile wallets to see where your money sits.": "নগদ, ব্যাংক ও মোবাইল ওয়ালেট যোগ করুন, দেখুন আপনার টাকা কোথায় আছে।",
  "To savings": "সঞ্চয়ে",
  "Moved from this account into a savings goal": "এই হিসাব থেকে সঞ্চয় লক্ষ্যে সরানো",
  Transfers: "ট্রান্সফার",
  "Balance transfers between your own wallets (+ in, − out)": "নিজের ওয়ালেটের মধ্যে ব্যালেন্স ট্রান্সফার (+ এসেছে, − গেছে)",
  "Current balance": "বর্তমান ব্যালেন্স",

  // My wallets (WalletPageClient.tsx, WalletCard.tsx)
  "The cash, bank and mobile accounts that hold your money.": "আপনার টাকা যেখানে থাকে: নগদ, ব্যাংক ও মোবাইল হিসাব।",
  "Available across": "মোট",
  wallets: "ওয়ালেটে",
  Across: "মোট",
  "active wallets": "সক্রিয় ওয়ালেটে",
  "Opening balances": "প্রারম্ভিক ব্যালেন্স",
  "What the wallets held when you added them": "যোগ করার সময় ওয়ালেটগুলোতে যা ছিল",
  "Change since opening": "শুরুর পর থেকে পরিবর্তন",
  "Current balance minus opening balances": "বর্তমান ব্যালেন্স বাদ প্রারম্ভিক ব্যালেন্স",
  "Wallet status": "ওয়ালেটের অবস্থা",
  "Cash, bank account or mobile wallet": "নগদ, ব্যাংক হিসাব বা মোবাইল ওয়ালেট",
  "No wallets yet.": "এখনো কোনো ওয়ালেট নেই।",
  "No archived wallet.": "আর্কাইভ করা কোনো ওয়ালেট নেই।",
  "Actions for": "কার্যক্রম:",
  "Edit wallet": "ওয়ালেট সম্পাদনা",
  "View ledger": "লেজার দেখুন",
  Unarchive: "আনআর্কাইভ",
  "No account number": "হিসাব নম্বর নেই",
  "A wallet with transactions is archived instead of deleted, so your history stays whole.": "লেনদেন থাকা ওয়ালেট মোছার বদলে আর্কাইভ হয়, যাতে আপনার ইতিহাস অটুট থাকে।",
  "Remove wallet": "ওয়ালেট সরান",
  "Wallet archived": "ওয়ালেট আর্কাইভ করা হয়েছে",
  "Failed to archive wallet": "ওয়ালেট আর্কাইভ করতে ব্যর্থ",
  "Wallet activated": "ওয়ালেট সক্রিয় করা হয়েছে",
  "Failed to activate wallet": "ওয়ালেট সক্রিয় করতে ব্যর্থ",
  "Wallet deleted": "ওয়ালেট মুছে ফেলা হয়েছে",
  "Failed to remove wallet": "ওয়ালেট সরাতে ব্যর্থ",

  // Add / edit wallet (WalletDrawer.tsx)
  "Where do you keep this money?": "এই টাকা কোথায় রাখেন?",
  "New wallet": "নতুন ওয়ালেট",
  "Wallet name": "ওয়ালেটের নাম",
  "e.g. Islami Bank": "যেমন, ইসলামী ব্যাংক",
  "Account number": "হিসাব নম্বর",
  "Opening balance": "প্রারম্ভিক ব্যালেন্স",
  "How much is in this wallet right now. Bangla digits (২৫০০০) work too.": "এই ওয়ালেটে এখন কত আছে। বাংলা সংখ্যাও (২৫০০০) চলবে।",
  "Create wallet": "ওয়ালেট তৈরি করুন",
  "Wallet updated": "ওয়ালেট আপডেট হয়েছে",
  "Wallet created": "ওয়ালেট তৈরি হয়েছে",
  "Failed to update wallet": "ওয়ালেট আপডেট করতে ব্যর্থ",
  "Failed to create wallet": "ওয়ালেট তৈরি করতে ব্যর্থ",

  // Transfer (BalanceTransferPageClient.tsx)
  "Move money between your own wallets.": "নিজের ওয়ালেটের মধ্যে টাকা সরান।",
  "New transfer": "নতুন ট্রান্সফার",
  "Moved in this period": "এই সময়ে সরানো হয়েছে",
  transfers: "ট্রান্সফার",
  "Only transfers that still stand are counted": "শুধু বহাল থাকা ট্রান্সফার গণনায় ধরা হয়",
  "voided transfer isn't counted": "বাতিল ট্রান্সফার গণনায় নেই",
  "voided transfers aren't counted": "বাতিল ট্রান্সফার গণনায় নেই",
  "Your total balance doesn't change": "আপনার মোট ব্যালেন্স বদলায় না",
  "A transfer only moves money between your wallets. It's never counted as income or expense.": "ট্রান্সফার শুধু আপনার ওয়ালেটের মধ্যে টাকা সরায়। এটি কখনো আয় বা ব্যয় হিসেবে গণ্য হয় না।",
  "Transfer history": "ট্রান্সফারের ইতিহাস",
  "No transfer yet": "এখনো কোনো ট্রান্সফার নেই",
  "Move money between your wallets and it shows up here.": "ওয়ালেটের মধ্যে টাকা সরান, এখানে দেখা যাবে।",
  "From → To": "থেকে → যেখানে",
  "Newest first": "নতুনটি আগে",
  "Void transfer": "ট্রান্সফার বাতিল করুন",
  "Void this transfer?": "এই ট্রান্সফার বাতিল করবেন?",
  "Both wallets go back to their balances from before this transfer. It stays in your history, marked as voided.": "দুটি ওয়ালেটই এই ট্রান্সফারের আগের ব্যালেন্সে ফিরে যাবে। এটি বাতিল চিহ্নসহ ইতিহাসে থেকে যাবে।",
  "Transfer voided": "ট্রান্সফার বাতিল হয়েছে",

  // Statement (AccountLedgerPageClient.tsx, AccountPicker.tsx)
  "Every movement through one account, with a running balance.": "একটি হিসাবের প্রতিটি লেনদেন, চলমান ব্যালেন্সসহ।",
  "Pick an account first": "আগে একটি হিসাব বেছে নিন",
  "Search any account: wallets, income, expense…": "যেকোনো হিসাব খুঁজুন: ওয়ালেট, আয়, ব্যয়…",
  "Clear account": "হিসাব সাফ করুন",
  "Type to search": "খুঁজতে লিখুন",
  "Search accounts": "হিসাব খুঁজুন",
  "Other accounts": "অন্যান্য হিসাব",
  "No account matches": "মেলে এমন কোনো হিসাব নেই",
  "Pick an account to see its ledger": "লেজার দেখতে একটি হিসাব বেছে নিন",
  "You'll see its opening balance, every movement and the running balance, ready to print.": "দেখবেন প্রারম্ভিক ব্যালেন্স, প্রতিটি লেনদেন ও চলমান ব্যালেন্স, প্রিন্টের জন্য প্রস্তুত।",
  "Your wallets": "আপনার ওয়ালেট",
  "Income, expense and other accounts are in the search above.": "আয়, ব্যয় ও অন্যান্য হিসাব উপরের সার্চে পাবেন।",
  "Opening balance plus money in, minus money out, plus transfers, equals closing balance": "প্রারম্ভিক ব্যালেন্স যোগ জমা, বিয়োগ উত্তোলন, যোগ ট্রান্সফার, সমান সমাপনী ব্যালেন্স",
  "Closing balance": "সমাপনী ব্যালেন্স",
  Reference: "রেফারেন্স",
  In: "জমা",
  Out: "উত্তোলন",
  entries: "এন্ট্রি",
  Page: "পৃষ্ঠা",
  Journal: "জার্নাল",
  // lib/customer/transactionDisplay.ts -- type names and the cancelled-row
  // notes on the transaction lists and detail page.
  Sale: "বিক্রয়",
  Purchase: "ক্রয়",
  Posted: "পোস্টকৃত",
  Reversal: "বিপরীত এন্ট্রি",
  "Sale (Credit)": "বিক্রয় (বাকিতে)",
  "Purchase (Credit)": "ক্রয় (বাকিতে)",

  // src/components/modules/Customer/Accounts/AccountDetailPageClient.tsx --
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
  Adjustment: "সমন্বয়",

  // src/components/modules/Customer/Accounts/AccountFormModal.tsx --
  // "Name"/"Cancel"/"Save Changes"/"Create" reuse shared.ts's keys,
  // "(optional)" reuses loan-management.ts's key.
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

  // src/components/modules/Customer/Accounts/AccountsPageClient.tsx --
  // "Add"/"Edit" reuse shared.ts's keys, "Archive"/"Archived" reuse
  // loan-management.ts's keys, "account(s)" reuses reports.ts's key,
  // "Default" reuses settings-workspace.ts's key, ACCOUNT_TYPE_LABELS reuse
  // reports.ts's/shared.ts's keys.
  "Chart of Accounts": "হিসাবচিত্র",
  "All accounts for this workspace, grouped by type.": "এই ওয়ার্কস্পেসের সকল হিসাব, ধরন অনুযায়ী গ্রুপ করা।",
  "No accounts yet.": "এখনো কোনো হিসাব নেই।",
  "Account archived": "হিসাব আর্কাইভ করা হয়েছে",
  "Failed to archive account": "হিসাব আর্কাইভ করতে ব্যর্থ",
  "Account deleted": "হিসাব মুছে ফেলা হয়েছে",
  "Failed to remove account": "হিসাব সরাতে ব্যর্থ",
};
