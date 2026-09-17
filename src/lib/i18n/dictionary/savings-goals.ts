// Bangla translations for: /savings-goals/* (Dashboard, Overview, Wallet,
// Transfer) and their components under src/components/savings-goals/.
export const savingsGoalsDictionary: Record<string, string> = {
  // src/app/(dashboard)/savings-goals/overview/page.tsx
  "Savings Overview": "সঞ্চয় ওভারভিউ",
  "Savings Account Overview": "সঞ্চয় হিসাব ওভারভিউ",
  "Total Accounts": "মোট হিসাব",
  "Total Balance": "মোট ব্যালেন্স",
  "Inactive Amount": "নিষ্ক্রিয় পরিমাণ",
  // "Available Balance" now lives in dictionary/shared.ts (was duplicated
  // here with a different wording than personal.ts's own copy).
  "Account Details": "হিসাবের বিবরণ",
  "No Savings Wallets yet.": "এখনও কোনো সঞ্চয় ওয়ালেট নেই।",
  Opening: "প্রারম্ভিক",
  "Total In": "মোট জমা",
  "Total Out": "মোট উত্তোলন",

  // src/components/savings-goals/AddContributionModal.tsx
  "Add Contribution": "কন্ট্রিবিউশন যোগ করুন",
  "Contribution added": "কন্ট্রিবিউশন যোগ করা হয়েছে",
  "Failed to add contribution": "কন্ট্রিবিউশন যোগ করা যায়নি",
  "Adding funds to": "তহবিল যোগ করা হচ্ছে",
  "From Account": "উৎস হিসাব",
  "No money accounts yet": "এখনও কোনো মানি হিসাব নেই",
  "To Wallet": "ওয়ালেটে",
  "No Savings Wallets yet": "এখনও কোনো সঞ্চয় ওয়ালেট নেই",
  "No Savings Wallets yet --": "এখনও কোনো সঞ্চয় ওয়ালেট নেই --",
  "add one": "একটি যোগ করুন",
  "first.": "প্রথমে।",

  // src/components/savings-goals/GoalActionsMenu.tsx
  "Edit Goal": "লক্ষ্য সম্পাদনা",
  "Resume Goal": "লক্ষ্য পুনরায় শুরু করুন",
  "Pause Goal": "লক্ষ্য বিরতি দিন",
  "Withdraw Savings": "সঞ্চয় উত্তোলন",
  "Delete Goal": "লক্ষ্য মুছুন",

  // src/components/savings-goals/SavingsGoalDetailModal.tsx
  "Goal Details": "লক্ষ্যের বিবরণ",
  "Couldn't load this goal.": "এই লক্ষ্যটি লোড করা যায়নি।",
  Saved: "সঞ্চিত",
  Target: "লক্ষ্য",
  Progress: "অগ্রগতি",
  History: "ইতিহাস",
  "No contributions or transfers yet.": "এখনও কোনো কন্ট্রিবিউশন বা ট্রান্সফার নেই।",
  Contribution: "কন্ট্রিবিউশন",
  "Transfer In": "ট্রান্সফার ইন",
  "Transfer Out": "ট্রান্সফার আউট",
  Withdrawal: "উত্তোলন",
  from: "থেকে",
  to: "এ",

  // src/components/savings-goals/SavingsGoalFormModal.tsx
  "Phone (SMS)": "ফোন (এসএমএস)",
  "Add Savings Goal": "সঞ্চয় লক্ষ্য যোগ করুন",
  "Goal updated": "লক্ষ্য আপডেট হয়েছে",
  "Goal created": "লক্ষ্য তৈরি হয়েছে",
  "Failed to save goal": "লক্ষ্য সংরক্ষণ করা যায়নি",
  "Goal Name": "লক্ষ্যের নাম",
  "e.g., Vacation Fund, Emergency Fund": "যেমন, ভ্রমণ তহবিল, জরুরি তহবিল",
  "Target Amount": "লক্ষ্য পরিমাণ",
  "Target End Date": "লক্ষ্যের শেষ তারিখ",
  away: "দূরে",
  "Reminder Date": "রিমাইন্ডার তারিখ",
  "Saved for later -- this app doesn't send real email/SMS reminders yet.":
    "পরে ব্যবহারের জন্য সংরক্ষিত -- এই অ্যাপ এখনও প্রকৃত ইমেইল/এসএমএস রিমাইন্ডার পাঠায় না।",
  "Add details about your savings goal...": "আপনার সঞ্চয় লক্ষ্য সম্পর্কে বিস্তারিত যোগ করুন...",

  // src/components/savings-goals/SavingsGoalsDashboardPageClient.tsx
  "Saving Goals": "সঞ্চয় লক্ষ্যসমূহ",
  "Add New Goal": "নতুন লক্ষ্য যোগ করুন",
  "Total Saved": "মোট সঞ্চিত",
  "Total Goals": "মোট লক্ষ্য",
  Remaining: "অবশিষ্ট",
  "Monthly Savings": "মাসিক সঞ্চয়",
  "Saved This Month": "এই মাসে সঞ্চিত",
  "Savings Rate": "সঞ্চয়ের হার",
  "of monthly income": "মাসিক আয়ের",
  All: "সব",
  Paused: "বিরতি দেওয়া",
  Completed: "সম্পন্ন",
  Withdrawn: "উত্তোলিত",
  "On Track": "সঠিক পথে",
  "Behind Schedule": "সময়সূচির পিছনে",
  Warning: "সতর্কতা",
  Increasing: "ক্রমবর্ধমান",
  Decreasing: "ক্রমহ্রাসমান",
  Stable: "স্থিতিশীল",
  "Target:": "লক্ষ্য:",
  "Withdrawn:": "উত্তোলিত:",
  "Add Funds": "তহবিল যোগ করুন",
  of: "এর মধ্যে",
  "This can't be undone. Goals with contributions or transfers must be paused instead.":
    "এটি পূর্বাবস্থায় ফেরানো যাবে না। কন্ট্রিবিউশন বা ট্রান্সফার থাকা লক্ষ্যগুলো অবশ্যই বিরতি দিতে হবে।",
  "Goal resumed": "লক্ষ্য পুনরায় শুরু হয়েছে",
  "Goal paused": "লক্ষ্য বিরতি দেওয়া হয়েছে",
  "Failed to update goal": "লক্ষ্য আপডেট করা যায়নি",
  "Goal deleted": "লক্ষ্য মুছে ফেলা হয়েছে",
  "Failed to delete goal": "লক্ষ্য মুছা যায়নি",
  "No savings goals yet.": "এখনও কোনো সঞ্চয় লক্ষ্য নেই।",

  // src/components/savings-goals/SavingsTransferModal.tsx
  "Savings Transfer": "সঞ্চয় ট্রান্সফার",
  "From Goal": "উৎস লক্ষ্য",
  "Search goals": "লক্ষ্য খুঁজুন",
  "No goals yet": "এখনও কোনো লক্ষ্য নেই",
  "To Goal": "গন্তব্য লক্ষ্য",
  "Moves saved money between two goals. Your total savings stays the same.":
    "সঞ্চিত অর্থ দুটি লক্ষ্যের মধ্যে স্থানান্তরিত হয়। আপনার মোট সঞ্চয় অপরিবর্তিত থাকে।",
  Transferred: "স্থানান্তরিত হয়েছে",
  "Failed to transfer": "স্থানান্তর ব্যর্থ হয়েছে",
  Transfer: "ট্রান্সফার",

  // src/components/savings-goals/SavingsTransferPageClient.tsx
  "Move saved money between goals.": "লক্ষ্যগুলোর মধ্যে সঞ্চিত অর্থ স্থানান্তর করুন।",
  "New Transfer": "নতুন ট্রান্সফার",
  "You need at least two savings goals to transfer between them.": "স্থানান্তর করতে আপনার অন্তত দুটি সঞ্চয় লক্ষ্য প্রয়োজন।",
  "Transfer History": "ট্রান্সফার ইতিহাস",
  "No transfers yet.": "এখনও কোনো ট্রান্সফার নেই।",
  From: "থেকে",
  To: "প্রতি",

  // src/components/savings-goals/SavingsWalletFormModal.tsx
  "Edit Savings Wallet": "সঞ্চয় ওয়ালেট সম্পাদনা",
  "Add Savings Wallet": "সঞ্চয় ওয়ালেট যোগ করুন",
  "Savings Wallet updated": "সঞ্চয় ওয়ালেট আপডেট হয়েছে",
  "Savings Wallet created": "সঞ্চয় ওয়ালেট তৈরি হয়েছে",
  "Failed to update Savings Wallet": "সঞ্চয় ওয়ালেট আপডেট করা যায়নি",
  "Failed to create Savings Wallet": "সঞ্চয় ওয়ালেট তৈরি করা যায়নি",
  "Wallet Name": "ওয়ালেটের নাম",
  "e.g. Islami Bank DPS": "যেমন, Islami Bank DPS",
  "Account Number": "হিসাব নম্বর",
  "e.g. 01711223344": "যেমন, 01711223344",

  // src/components/savings-goals/SavingsWalletPageClient.tsx
  "Savings Wallet": "সঞ্চয় ওয়ালেট",
  "Where your saved money actually sits -- e.g. a bank DPS/FDR account.":
    "যেখানে আপনার সঞ্চিত অর্থ প্রকৃতপক্ষে থাকে -- যেমন, একটি ব্যাংক ডিপিএস/এফডিআর হিসাব।",
  "No Savings Wallets yet -- add one to start funding goals.": "এখনও কোনো সঞ্চয় ওয়ালেট নেই -- লক্ষ্যে অর্থায়ন শুরু করতে একটি যোগ করুন।",
  Archive: "আর্কাইভ",
  "Savings Wallet archived": "সঞ্চয় ওয়ালেট আর্কাইভ করা হয়েছে",
  "Failed to archive Savings Wallet": "সঞ্চয় ওয়ালেট আর্কাইভ করা যায়নি",

  // src/components/savings-goals/SavingsWithdrawModal.tsx
  "Goal withdrawn and recorded as an expense": "লক্ষ্য উত্তোলিত হয়েছে এবং ব্যয় হিসেবে রেকর্ড করা হয়েছে",
  "Failed to withdraw savings": "সঞ্চয় উত্তোলন করা যায়নি",
  "Withdrawing the full": "সম্পূর্ণ পরিমাণ উত্তোলন করা হচ্ছে",
  "saved for": "যা সঞ্চিত হয়েছে",
  "The goal will be marked": "লক্ষ্যটি চিহ্নিত করা হবে",
  "and this can't be undone.": "এবং এটি পূর্বাবস্থায় ফেরানো যাবে না।",
  "From Savings Wallet": "সঞ্চয় ওয়ালেট থেকে",
  "Spend As (Expense Category)": "ব্যয় হিসেবে (খরচের ক্যাটাগরি)",
  "No expense categories yet": "এখনও কোনো ব্যয় ক্যাটাগরি নেই",
  "No expense account exists in this workspace yet -- add one in Chart of Accounts first.":
    "এই ওয়ার্কস্পেসে এখনও কোনো ব্যয় হিসাব নেই -- প্রথমে চার্ট অফ অ্যাকাউন্টসে একটি যোগ করুন।",
};
