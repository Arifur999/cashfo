// Bangla for the whole site, keyed by the exact English string passed to
// translate()/t() -- English is the source language, so only the Bangla side
// is listed. Split by area (the admin panel here, the sign-in pages in
// authDictionary.ts, the customer app in dictionary/*.ts) so translating one
// area never touches another. It is one flat namespace: a key defined twice
// takes the value spread last below.
import { bnAuthDictionary } from "./authDictionary";
import { adminDashboardDictionary } from "./dictionary/admin-dashboard";
import { adminSecurityDictionary } from "./dictionary/admin-security";
import { adminSharedDictionary } from "./dictionary/admin-shared";
import { assetsDictionary } from "./dictionary/assets";
import { balanceDictionary } from "./dictionary/balance";
import { booksDictionary } from "./dictionary/books";
import { businessBooksDictionary } from "./dictionary/business-books";
import { chromeDictionary } from "./dictionary/chrome";
import { dashboardDictionary } from "./dictionary/dashboard";
import { groupExpensesDictionary } from "./dictionary/group-expenses";
import { habitTrackerDictionary } from "./dictionary/habit-tracker";
import { incomeExpenseDictionary } from "./dictionary/income-expense";
import { loanManagementDictionary } from "./dictionary/loan-management";
import { referralsDictionary } from "./dictionary/referrals";
import { reportsDictionary } from "./dictionary/reports";
import { savingsGoalsDictionary } from "./dictionary/savings-goals";
import { settingsDictionary } from "./dictionary/settings";
import { settingsWorkspaceDictionary } from "./dictionary/settings-workspace";
import { sharedDictionary } from "./dictionary/shared";
import { skillsDictionary } from "./dictionary/skills";
import { todosDictionary } from "./dictionary/todos";
import { vaultDictionary } from "./dictionary/vault";

// The admin panel's own chrome.
const bnAdminDictionary: Record<string, string> = {
  "Admin Panel": "অ্যাডমিন প্যানেল",
  Dashboard: "ড্যাশবোর্ড",
  "User Management": "ইউজার ম্যানেজমেন্ট",
  Workspaces: "ওয়ার্কস্পেস",
  Subscriptions: "সাবস্ক্রিপশন",
  Payments: "পেমেন্ট",
  Content: "কন্টেন্ট",
  Support: "সাপোর্ট",
  Analytics: "অ্যানালিটিক্স",
  Security: "সিকিউরিটি",
  System: "সিস্টেম",
  Notifications: "নোটিফিকেশন",
  Settings: "সেটিংস",
  "Manage Owners": "মালিক ব্যবস্থাপনা",
  Overview: "ওভারভিউ",
  Customers: "গ্রাহক",
  Billing: "বিলিং",
  Operations: "অপারেশনস",
  Administration: "প্রশাসন",
  // The Smartly admin shell
  Admin: "অ্যাডমিন",
  People: "মানুষ",
  Users: "ইউজার",
  Owners: "মালিক",
  "Plans & coupons": "প্ল্যান ও কুপন",
  "Support & content": "সাপোর্ট ও কন্টেন্ট",
  Platform: "প্ল্যাটফর্ম",
  "Super admin": "সুপার অ্যাডমিন",
  "Support admin": "সাপোর্ট অ্যাডমিন",
  "Finance admin": "ফিন্যান্স অ্যাডমিন",
  "Content admin": "কন্টেন্ট অ্যাডমিন",
  "full access": "পূর্ণ অ্যাক্সেস",
  "View only for your role": "আপনার রোলে শুধু দেখা যায়",
  "Smartly admin home": "Smartly অ্যাডমিন হোম",
  "Coming soon": "শীঘ্রই আসছে",
  "Welcome back,": "স্বাগতম,",
  "Log out": "লগ আউট",
  "Open navigation": "নেভিগেশন খুলুন",
  "Main navigation": "প্রধান নেভিগেশন",
  "Account menu": "অ্যাকাউন্ট মেনু",
  "My account": "আমার অ্যাকাউন্ট",
  Save: "সংরক্ষণ",
  Cancel: "বাতিল",
  Edit: "সম্পাদনা",
  Delete: "মুছুন",
};

// Every admin area's Bangla, in the order a later area wins.
const adminDictionaries: Record<string, string> = {
  ...adminSharedDictionary,
  ...bnAdminDictionary,
  ...adminDashboardDictionary,
  ...adminSecurityDictionary,
};

export const bnDictionary: Record<string, string> = {
  ...adminDictionaries,
  ...bnAuthDictionary,
  ...chromeDictionary,
  ...dashboardDictionary,
  ...balanceDictionary,
  ...assetsDictionary,
  ...savingsGoalsDictionary,
  ...loanManagementDictionary,
  ...incomeExpenseDictionary,
  ...reportsDictionary,
  ...referralsDictionary,
  ...vaultDictionary,
  ...settingsWorkspaceDictionary,
  ...settingsDictionary,
  ...groupExpensesDictionary,
  ...habitTrackerDictionary,
  ...booksDictionary,
  ...businessBooksDictionary,
  ...skillsDictionary,
  ...todosDictionary,
  // Last, so a word every customer page shares (see that file) always wins
  // over an area that happened to word it differently.
  ...sharedDictionary,
};

// The same words with the admin areas' wording on top, for the admin panel.
export const bnAdminScopeDictionary: Record<string, string> = {
  ...bnDictionary,
  ...adminDictionaries,
};
