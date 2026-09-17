// Bangla translations for shared chrome: Sidebar, TopBar, UserMenu, and the
// placeholder /dashboard page. "Money Tracker" (the brand name) is
// deliberately NOT translated -- t() falls back to the English string for
// any key with no entry here, which is exactly right for a proper noun.
export const chromeDictionary: Record<string, string> = {
  // Sidebar top-level items
  Dashboard: "ড্যাশবোর্ড",
  Balance: "ব্যালেন্স",
  "Assets Management": "সম্পদ ব্যবস্থাপনা",
  "Savings Goals": "সঞ্চয় লক্ষ্য",
  "Loan Management": "ঋণ ব্যবস্থাপনা",
  "Income & Expense": "আয় ও ব্যয়",
  Reports: "রিপোর্ট",
  Referrals: "রেফারেল",
  "Password Manager": "পাসওয়ার্ড ম্যানেজার",
  Settings: "সেটিংস",

  // Balance submenu
  Overview: "ওভারভিউ",
  "Balance Transfer": "ব্যালেন্স ট্রান্সফার",
  Ledger: "লেজার",
  Wallet: "ওয়ালেট",

  // Assets Management submenu
  "Current Asset list": "বর্তমান সম্পদের তালিকা",
  "Purchase & Sell Asset": "সম্পদ ক্রয় ও বিক্রয়",
  "Asset update": "সম্পদ আপডেট",
  Category: "ক্যাটাগরি",

  // Savings Goals submenu
  Transfer: "ট্রান্সফার",

  // Loan Management submenu
  Transactions: "লেনদেন",
  Contacts: "পরিচিতি",

  // Income & Expense submenu
  Transaction: "লেনদেন",
  "Budget Planning": "বাজেট পরিকল্পনা",
  "Monthly income goal": "মাসিক আয়ের লক্ষ্য",

  // Reports submenu
  "General Ledger": "জেনারেল লেজার",
  "Trial Balance": "ট্রায়াল ব্যালেন্স",
  "Aging Receivable": "বকেয়া প্রাপ্য",
  "Aging Payable": "বকেয়া দেয়",

  // UserMenu
  Profile: "প্রোফাইল",
  "Log out": "লগ আউট",

  // /dashboard placeholder page
  "Welcome,": "স্বাগতম,",
  "The full app (transactions, accounts, budgets) is being built next -- this page just confirms your account and workspace switching work.":
    "সম্পূর্ণ অ্যাপ (লেনদেন, হিসাব, বাজেট) পরবর্তীতে তৈরি করা হবে -- এই পেজটি শুধু নিশ্চিত করে যে আপনার অ্যাকাউন্ট ঠিকমতো কাজ করছে।",
};
