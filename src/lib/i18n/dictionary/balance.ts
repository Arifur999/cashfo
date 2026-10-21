// Bangla translations for Money › Wallets (/balance/*: Balance, My
// wallets, Transfer, Statement), /accounts and /accounts/[id], and their
// components under components/modules/Customer/Balance and .../Accounts.
// Keys another dictionary already defines ("Money", "Wallets", "Transfer",
// "Statement", "Move money", "Cancel", "Edit", "Remove", "Archive",
// "Archived", "Opening", "Type", "Date", "Amount", "Note", "Voided", "View",
// "Balance", "Description", "Print", "Period", "Custom", "Close", "Preview",
// "Reason", the period names, the pager's words, "Brought forward"/"Carried
// forward", "Showing", "of", "to", "View details", "Add wallet", "Add a
// wallet", "No wallet yet", "Ledger", "Total balance", "Money in"/"Money
// out", "Active", "Wallet", "Savings", "Savings wallet", "unchanged" and
// "e.g. 01711223344") are not repeated.
export const balanceDictionary: Record<string, string> = {
  // Also in savings-goals.ts and referrals.ts, with the same Bangla to the
  // letter, so these pages stay in Bangla whatever becomes of those copies
  // (Balance, My wallets, WalletCard, the two drawers). Keep them identical:
  // the dictionary spread last is the one that shows.
  "{amount} in archived wallets": "আর্কাইভ করা ওয়ালেটে {amount}",
  "{count} archived": "{count}টি আর্কাইভ করা",
  "Remove {name}?": "{name} সরাবেন?",
  "Actions for {name}": "{name}-এর কার্যক্রম",
  "Couldn't reach Smartly. Check your connection and try again.": "Smartly-র সাথে যোগাযোগ করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।",

  // The wallet kinds (lib/customer/walletVisuals.ts).
  Cash: "নগদ",
  "Bank account": "ব্যাংক হিসাব",
  "Mobile wallet": "মোবাইল ওয়ালেট",
  // A wallet's state on its card, a tab and a Balance row: an adjective,
  // where loan-management.ts's "Archived" says "has been archived".
  "Archived@@status": "আর্কাইভ করা",
  // A wallet's in- and out-flows. Not reports.ts's "Money in"/"Money out"
  // (আয়/খরচ): a loan received or a sale's cash is money in, not income.
  "Money in@@wallet": "টাকা এসেছে",
  "Money out@@wallet": "টাকা গেছে",

  // Balance (balance/overview/page.tsx)
  Opening: "প্রারম্ভিক",
  "Where your money sits right now, and how each account got there.": "আপনার টাকা এখন কোথায় আছে, আর প্রতিটি হিসাব কীভাবে সেখানে পৌঁছাল।",
  "Available balance": "ব্যবহারযোগ্য ব্যালেন্স",
  "Total balance {amount}": "মোট ব্যালেন্স {amount}",
  "Active wallets": "সক্রিয় ওয়ালেট",
  Accounts: "হিসাবসমূহ",
  "Share of balance by wallet": "ওয়ালেট অনুযায়ী ব্যালেন্সের ভাগ",
  "Account details": "হিসাবের বিবরণ",
  "Open a row to see its statement": "স্টেটমেন্ট দেখতে একটি সারি খুলুন",
  "Add your cash, bank and mobile wallets to see where your money sits.": "নগদ, ব্যাংক ও মোবাইল ওয়ালেট যোগ করুন, দেখুন আপনার টাকা কোথায় আছে।",
  "To savings": "সঞ্চয়ে",
  "Moved from this account into a savings goal": "এই হিসাব থেকে সঞ্চয় লক্ষ্যে সরানো",
  Transfers: "ট্রান্সফার",
  "Balance transfers between your own wallets (+ in, − out)": "নিজের ওয়ালেটের মধ্যে ব্যালেন্স ট্রান্সফার (+ এসেছে, − গেছে)",
  "Current balance": "বর্তমান ব্যালেন্স",

  // TransferDrawer.tsx (Move money)
  "Between your own wallets": "নিজের ওয়ালেটগুলোর মধ্যে",
  "Available@@balance": "ব্যবহারযোগ্য",
  "To@@wallet": "যেখানে",
  "Moving money needs two wallets.": "টাকা সরাতে দুটি ওয়ালেট লাগে।",
  "Up to {amount} available in {wallet}": "{wallet}-এ {amount} পর্যন্ত আছে",
  "{wallet} has {amount}": "{wallet}-এ আছে {amount}",
  "This leaves {wallet} at {amount}.": "এতে {wallet}-এ থাকবে {amount}।",
  "e.g. Card bill": "যেমন কার্ডের বিল",
  "After this transfer": "এই ট্রান্সফারের পর",
  "Move {amount}": "{amount} সরান",
  // Its own toasts: income-expense.ts's transfer ones say স্থানান্তর, and
  // every label here says ট্রান্সফার or টাকা সরান.
  "Money moved": "টাকা সরানো হয়েছে",
  "Couldn't move the money": "টাকা সরানো যায়নি",

  // My wallets (WalletPageClient.tsx, WalletCard.tsx)
  "The cash, bank and mobile accounts that hold your money.": "আপনার টাকা যেখানে থাকে: নগদ, ব্যাংক ও মোবাইল হিসাব।",
  // Whole sentences, so their "ওয়ালেটে" never overrides Home's bare "wallets".
  "Available across {count} wallet": "মোট {count}টি ওয়ালেটে",
  "Available across {count} wallets": "মোট {count}টি ওয়ালেটে",
  "Across {count} active wallet": "মোট {count}টি সক্রিয় ওয়ালেটে",
  "Across {count} active wallets": "মোট {count}টি সক্রিয় ওয়ালেটে",
  "Opening balances": "প্রারম্ভিক ব্যালেন্স",
  "What the wallets held when you added them": "যোগ করার সময় ওয়ালেটগুলোতে যা ছিল",
  "Change since opening": "শুরুর পর থেকে পরিবর্তন",
  "Current balance minus opening balances": "বর্তমান ব্যালেন্স বাদ প্রারম্ভিক ব্যালেন্স",
  "Wallet status": "ওয়ালেটের অবস্থা",
  "Cash, bank account or mobile wallet": "নগদ, ব্যাংক হিসাব বা মোবাইল ওয়ালেট",
  "No wallets yet.": "এখনো কোনো ওয়ালেট নেই।",
  "No archived wallet.": "আর্কাইভ করা কোনো ওয়ালেট নেই।",
  "Edit wallet": "ওয়ালেট সম্পাদনা",
  "View statement": "স্টেটমেন্ট দেখুন",
  "View the statement of {name}": "{name}-এর স্টেটমেন্ট দেখুন",
  Unarchive: "আনআর্কাইভ",
  "No account number": "হিসাব নম্বর নেই",
  "A wallet with transactions is archived instead of deleted, so your history stays whole.": "লেনদেন থাকা ওয়ালেট মোছার বদলে আর্কাইভ হয়, যাতে আপনার ইতিহাস অটুট থাকে।",
  "Remove wallet": "ওয়ালেট সরান",
  // Remove on an archived wallet: only a wallet with no history goes.
  "Delete {name} for good?": "{name} চিরতরে মুছবেন?",
  "Only a wallet nothing was ever posted to can be deleted. One with transactions stays archived, so your history stays whole.": "যে ওয়ালেটে কখনো কোনো লেনদেন হয়নি, শুধু সেটিই মোছা যায়। লেনদেন থাকা ওয়ালেট আর্কাইভেই থাকে, যাতে আপনার ইতিহাস অটুট থাকে।",
  "Delete wallet": "ওয়ালেট মুছুন",
  "This wallet has transactions, so it stays archived to keep your history.": "এই ওয়ালেটে লেনদেন আছে, তাই ইতিহাস রাখতে এটি আর্কাইভেই থাকছে।",
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
  "e.g. 1234 5678 9012": "যেমন, ১২৩৪ ৫৬৭৮ ৯০১২",
  "Opening balance": "প্রারম্ভিক ব্যালেন্স",
  "How much is in this wallet right now. Bangla digits (২৫০০০) work too.": "এই ওয়ালেটে এখন কত আছে। বাংলা সংখ্যাও (২৫০০০) চলবে।",
  "It can't be changed. To fix the balance, add an income or expense for the difference.": "এটি বদলানো যায় না। ব্যালেন্স ঠিক করতে পার্থক্যটুকু আয় বা ব্যয় হিসেবে যোগ করুন।",
  "Create wallet": "ওয়ালেট তৈরি করুন",
  "Wallet updated": "ওয়ালেট আপডেট হয়েছে",
  "Wallet created": "ওয়ালেট তৈরি হয়েছে",
  "Failed to update wallet": "ওয়ালেট আপডেট করতে ব্যর্থ",
  "Failed to create wallet": "ওয়ালেট তৈরি করতে ব্যর্থ",

  // Transfer (BalanceTransferPageClient.tsx)
  "Move money between your own wallets.": "নিজের ওয়ালেটের মধ্যে টাকা সরান।",
  "Totals cover the latest 1,000 transfers only -- pick a shorter range for exact figures.": "মোট হিসাবে শুধু সর্বশেষ ১,০০০টি ট্রান্সফার ধরা হয়েছে -- সঠিক হিসাবের জন্য ছোট সময়সীমা বেছে নিন।",
  "Moved in this period": "এই সময়ে সরানো হয়েছে",
  "Not counting {amount} put into savings goals": "সঞ্চয় লক্ষ্যে রাখা {amount} বাদে",
  "Voided transfers aren't counted": "বাতিল ট্রান্সফার গণনায় নেই",
  // Under the Transfers count, which counts only the ones that still stand.
  "{count} voided transfer isn't counted": "বাতিল {count}টি ট্রান্সফার গণনায় নেই",
  "{count} voided transfers aren't counted": "বাতিল {count}টি ট্রান্সফার গণনায় নেই",
  "Only transfers that still stand are counted": "শুধু বহাল থাকা ট্রান্সফারই গণনায় আছে",
  "Your total balance doesn't change": "আপনার মোট ব্যালেন্স বদলায় না",
  "Moving money between your wallets never changes your total, and it's never income or expense. Money put into a savings goal moves to Savings Goals.":
    "নিজের ওয়ালেটের মধ্যে টাকা সরালে মোট ব্যালেন্স বদলায় না, আর এটি কখনো আয় বা ব্যয় নয়। সঞ্চয় লক্ষ্যে রাখা টাকা সঞ্চয় লক্ষ্যে চলে যায়।",
  "Transfer history": "ট্রান্সফারের ইতিহাস",
  "No transfer yet": "এখনো কোনো ট্রান্সফার নেই",
  "Move money between your wallets and it shows up here.": "ওয়ালেটের মধ্যে টাকা সরান, এখানে দেখা যাবে।",
  "No transfers in this period": "এই সময়ে কোনো ট্রান্সফার নেই",
  "Try another period, or move money now.": "অন্য সময় বেছে নিন, অথবা এখনই টাকা সরান।",
  "Show all time": "সর্বসময় দেখুন",
  "From → To": "থেকে → যেখানে",
  // A row's link, read out instead of the arrow between the two wallets.
  "{from} to {to}, {amount}": "{from} থেকে {to}, {amount}",
  "Newest first": "নতুনটি আগে",
  "Void transfer": "ট্রান্সফার বাতিল করুন",
  // In place of Void on a savings goal's deposit: Savings Goals undoes it.
  "Kept by the savings goal": "সঞ্চয় লক্ষ্যে রাখা আছে",
  "Kept by the savings goal. Open Savings Goals": "সঞ্চয় লক্ষ্যে রাখা আছে। সঞ্চয় লক্ষ্য খুলুন",
  "Void this transfer?": "এই ট্রান্সফার বাতিল করবেন?",
  "Both wallets go back to their balances from before this transfer. It stays in your history, marked as voided.": "দুটি ওয়ালেটই এই ট্রান্সফারের আগের ব্যালেন্সে ফিরে যাবে। এটি বাতিল চিহ্নসহ ইতিহাসে থেকে যাবে।",
  "Transfer voided": "ট্রান্সফার বাতিল হয়েছে",

  // Statement (AccountLedgerPageClient.tsx, AccountPicker.tsx, lib/customer/ledger.ts)
  "Every movement through one account, with a running balance.": "একটি হিসাবের প্রতিটি লেনদেন, চলমান ব্যালেন্সসহ।",
  "Search any account: wallets, income, expense…": "যেকোনো হিসাব খুঁজুন: ওয়ালেট, আয়, ব্যয়…",
  "Clear account": "হিসাব সাফ করুন",
  "Type to search": "খুঁজতে লিখুন",
  "Search accounts": "হিসাব খুঁজুন",
  "Other accounts": "অন্যান্য হিসাব",
  "No account matches": "মেলে এমন কোনো হিসাব নেই",
  "Pick an account to see its statement": "স্টেটমেন্ট দেখতে একটি হিসাব বেছে নিন",
  "You'll see its opening balance, every movement and the running balance, ready to print.": "দেখবেন প্রারম্ভিক ব্যালেন্স, প্রতিটি লেনদেন ও চলমান ব্যালেন্স, প্রিন্টের জন্য প্রস্তুত।",
  "Your wallets": "আপনার ওয়ালেট",
  "Income, expense and other accounts are in the search above.": "আয়, ব্যয় ও অন্যান্য হিসাব উপরের সার্চে পাবেন।",
  // A dated period opens on the balance brought to its first day, not on
  // the wallet's own opening balance.
  "Balance on {date}": "{date} তারিখের ব্যালেন্স",
  // The equation: a screen reader hears the operators between the terms.
  "From the opening balance to the closing balance": "প্রারম্ভিক থেকে সমাপনী ব্যালেন্স",
  "plus@@equation": "যোগ",
  "minus@@equation": "বিয়োগ",
  "equals@@equation": "সমান",
  // An expense category or a receivable only goes up or down.
  "Increase@@statement": "বেড়েছে",
  "Decrease@@statement": "কমেছে",
  "Transfers & savings": "ট্রান্সফার ও সঞ্চয়",
  "Voided & reversed": "বাতিল ও বিপরীত",
  "From a void or edit whose other half is in another period": "এমন বাতিল বা সম্পাদনা, যার অন্য অংশ আরেক সময়ে পড়েছে",
  "Closing balance": "সমাপনী ব্যালেন্স",
  // The closing line's note on the same residual (a signed amount).
  "Includes {amount} from voids or edits whose other half is in another period": "এতে এমন বাতিল বা সম্পাদনার {amount} ধরা আছে, যার অন্য অংশ আরেক সময়ে পড়েছে",
  "From the pages before": "আগের পৃষ্ঠাগুলো থেকে",
  "To the next page": "পরের পৃষ্ঠায়",
  // The printed copy's line: the period, and the day it was printed.
  "{from} to {to}": "{from} থেকে {to}",
  "From {from}": "{from} থেকে",
  "Up to {to}": "{to} পর্যন্ত",
  "Printed {date}": "প্রিন্টের তারিখ {date}",
  Reference: "রেফারেন্স",
  In: "জমা",
  Out: "উত্তোলন",
  entry: "এন্ট্রি",
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
