// Bangla translations for: /dashboard (the real post-login landing page --
// replaces the old placeholder confirming only that auth/workspace-switching
// worked) and its component under src/components/dashboard/.
//
// Note: several words this page also uses (Balance, Reports, Contacts,
// Transfer, Savings Goals, Loan Management, Income & Expense, Saved,
// Target, Net Balance, Pawna (You Receive), Dena (You Pay), Settled) are
// already translated in dictionary/chrome.ts, savings-goals.ts, and
// loan-management.ts -- reused here via the same English key, not
// redefined, so the sidebar/other pages and this page never drift apart.
export const dashboardDictionary: Record<string, string> = {
  "Welcome back,": "স্বাগতম,",
  "Here's what's happening with your money.": "আপনার টাকা-পয়সার সর্বশেষ অবস্থা এখানে দেখুন।",
  "Add Transaction": "লেনদেন যোগ করুন",
  "This Month Income": "এই মাসের আয়",
  "This Month Expense": "এই মাসের ব্যয়",
  "Net This Month": "এই মাসের নিট",
  "Total Savings": "মোট সঞ্চয়",
  "Total Assets": "মোট সম্পদ",
  "Recent Transactions": "সাম্প্রতিক লেনদেন",
  "No transactions yet.": "এখনো কোনো লেনদেন নেই।",
  "View All": "সব দেখুন",
  "No savings goals yet.": "এখনো কোনো সঞ্চয় লক্ষ্য নেই।",
  Explore: "সব ফিচার",
};
