// Bangla translations for: /transactions, /transactions/[id],
// /transactions/advanced, /categories (Budget Planning), /income-goal, and
// their components under src/components/quick-entry/, src/components/budget/,
// and src/components/transactions/.
export const incomeExpenseDictionary: Record<string, string> = {
  // src/app/(dashboard)/transactions/[id]/page.tsx
  "Journal Entry": "জার্নাল এন্ট্রি",
  "Reversal of transaction": "বিপরীত এন্ট্রি, লেনদেন",
  "Voided:": "বাতিল:",
  Debit: "ডেবিট",
  Credit: "ক্রেডিট",

  // src/app/(dashboard)/transactions/advanced/page.tsx
  "Back to Activity": "কার্যক্রমে ফিরে যান",
  "Advanced: Raw Journal Entry": "অ্যাডভান্সড: সরাসরি জার্নাল এন্ট্রি",
  "Direct double-entry posting -- uses Debit/Credit terminology on purpose, for power users and cases the friendly Income/Expense/Transfer forms don't cover.":
    "সরাসরি ডাবল-এন্ট্রি পোস্টিং -- ইচ্ছাকৃতভাবে ডেবিট/ক্রেডিট পরিভাষা ব্যবহার করা হয়েছে, পাওয়ার ইউজার এবং সহজ আয়/ব্যয়/ট্রান্সফার ফর্ম যেসব ক্ষেত্র কভার করে না তার জন্য।",

  // src/components/transactions/TransactionsPageClient.tsx
  Transactions: "লেনদেন",
  "Every income, expense and transfer you've added, newest first.": "আপনার যোগ করা প্রতিটি আয়, ব্যয় ও স্থানান্তর, নতুন থেকে পুরনো ক্রমে।",
  "Add Transaction": "লেনদেন যোগ করুন",
  "Search description...": "বিবরণ খুঁজুন...",
  "All types": "সব ধরন",
  "All accounts": "সব হিসাব",
  "From date": "শুরুর তারিখ",
  "To date": "শেষের তারিখ",
  Icon: "আইকন",
  Note: "নোট",
  Voided: "বাতিলকৃত",
  'Nothing here yet -- tap "Add" to get started.': 'এখনো কিছু নেই -- শুরু করতে "যোগ করুন" এ ট্যাপ করুন।',
  Showing: "দেখানো হচ্ছে",
  of: "এর মধ্যে",

  // src/components/transactions/JournalEntryForm.tsx
  "Transaction Type": "লেনদেনের ধরন",
  "What is this for?": "এটি কিসের জন্য?",
  Entries: "এন্ট্রিসমূহ",
  "Select account...": "হিসাব নির্বাচন করুন...",
  "Remove line": "লাইন সরান",
  "Add Line": "লাইন যোগ করুন",
  "Debits:": "ডেবিট:",
  "Credits:": "ক্রেডিট:",
  Balanced: "মিলেছে",
  "Out of balance by": "ভারসাম্যের পার্থক্য:",
  "Post Transaction": "লেনদেন পোস্ট করুন",
  "Transaction posted": "লেনদেন পোস্ট করা হয়েছে",
  "Failed to create transaction": "লেনদেন তৈরি করা যায়নি",

  // src/components/transactions/VoidTransactionButton.tsx
  Void: "বাতিল করুন",
  "Reason for voiding (min 5 chars)": "বাতিলের কারণ (সর্বনিম্ন ৫ অক্ষর)",
  "Confirm Void": "বাতিল নিশ্চিত করুন",
  "Reason must be at least 5 characters": "কারণ অবশ্যই কমপক্ষে ৫ অক্ষরের হতে হবে",
  "Transaction voided": "লেনদেন বাতিল করা হয়েছে",
  "Failed to void transaction": "লেনদেন বাতিল করা যায়নি",

  // src/components/quick-entry/AddTransactionModal.tsx
  "Select a category": "একটি ক্যাটাগরি নির্বাচন করুন",
  "No matching category": "কোনো মিলযুক্ত ক্যাটাগরি পাওয়া যায়নি",
  "No categories yet --": "এখনো কোনো ক্যাটাগরি নেই --",
  "add one under Budget Planning": "বাজেট পরিকল্পনায় গিয়ে একটি যোগ করুন",
  "No expense account exists in this workspace yet -- add one in Chart of Accounts first.":
    "এই ওয়ার্কস্পেসে এখনো কোনো ব্যয় হিসাব নেই -- প্রথমে হিসাবের তালিকায় একটি যোগ করুন।",
  "Deposit to": "যেখানে জমা হবে",
  "Pay from": "যেখান থেকে পরিশোধ হবে",
  "Select an account": "একটি হিসাব নির্বাচন করুন",
  "Add any additional details...": "আরও কোনো বিস্তারিত থাকলে যোগ করুন...",
  "Save Transaction": "লেনদেন সংরক্ষণ করুন",
  "Income added": "আয় যোগ করা হয়েছে",
  "Expense added": "ব্যয় যোগ করা হয়েছে",
  "Failed to save transaction": "লেনদেন সংরক্ষণ করা যায়নি",

  // src/components/quick-entry/TransferModal.tsx
  "Move Money": "টাকা স্থানান্তর করুন",
  From: "থেকে",
  To: "প্রতি",
  "From and To must be different accounts": "'থেকে' এবং 'প্রতি' অবশ্যই ভিন্ন হিসাব হতে হবে",
  "e.g. Moving savings to bank": "যেমন, সঞ্চয় থেকে ব্যাংকে স্থানান্তর",
  "Transfer completed": "স্থানান্তর সম্পন্ন হয়েছে",
  "Failed to create transfer": "স্থানান্তর তৈরি করা যায়নি",

  // src/components/budget/AddCategoryButton.tsx
  "Add Category": "ক্যাটাগরি যোগ করুন",
  "Income Category": "আয়ের ক্যাটাগরি",
  "Expense Category": "ব্যয়ের ক্যাটাগরি",

  // src/components/budget/BudgetCategoryModal.tsx
  "Edit Income Category": "আয়ের ক্যাটাগরি সম্পাদনা করুন",
  "Add Income Category": "আয়ের ক্যাটাগরি যোগ করুন",
  "Edit Expense Category": "ব্যয়ের ক্যাটাগরি সম্পাদনা করুন",
  "Add Expense Category": "ব্যয়ের ক্যাটাগরি যোগ করুন",
  "Create a category to organize your income -- the overall Monthly income goal is set separately":
    "আয় গোছাতে একটি ক্যাটাগরি তৈরি করুন -- সামগ্রিক মাসিক আয়ের লক্ষ্য আলাদাভাবে নির্ধারণ করা হয়",
  "Create a category with its own monthly spending limit": "নিজস্ব মাসিক ব্যয়ের সীমাসহ একটি ক্যাটাগরি তৈরি করুন",
  "Category Name": "ক্যাটাগরির নাম",
  "e.g., Salary, Commission, Rental Income": "যেমন, বেতন, কমিশন, ভাড়া থেকে আয়",
  "e.g., Groceries, Gas, Subscriptions": "যেমন, মুদি, গ্যাস, সাবস্ক্রিপশন",
  "Choose an Icon": "একটি আইকন নির্বাচন করুন",
  "Search icons...": "আইকন খুঁজুন...",
  "No matching icon": "কোনো মিলযুক্ত আইকন পাওয়া যায়নি",
  "Choose a Color": "একটি রং নির্বাচন করুন",
  "Monthly Budget Limit": "মাসিক বাজেট সীমা",
  "Give this category a name": "এই ক্যাটাগরির একটি নাম দিন",
  "Enter a limit greater than zero": "শূন্যের চেয়ে বড় একটি সীমা লিখুন",
  "Category updated": "ক্যাটাগরি আপডেট হয়েছে",
  "Category added": "ক্যাটাগরি যোগ করা হয়েছে",
  "Failed to save category": "ক্যাটাগরি সংরক্ষণ করা যায়নি",

  // src/components/budget/CategoriesPageClient.tsx
  "Budget Planning": "বাজেট পরিকল্পনা",
  "Organize your income sources and set spending limits, side by side.": "আপনার আয়ের উৎসগুলো সাজান এবং পাশাপাশি ব্যয়ের সীমা নির্ধারণ করুন।",

  // src/components/budget/ExpenseCategoryColumn.tsx and IncomeCategoryColumn.tsx (shared text)
  "Expense Categories": "ব্যয়ের ক্যাটাগরি",
  "Income Categories": "আয়ের ক্যাটাগরি",
  "Total budget:": "মোট বাজেট:",
  "Not set": "নির্ধারণ করা হয়নি",
  "Allocated:": "বরাদ্দকৃত:",
  "Manage Budget:": "বাজেট পরিচালনা করুন:",
  'No categories yet -- tap "Add Category" to get started.': 'এখনো কোনো ক্যাটাগরি নেই -- শুরু করতে "ক্যাটাগরি যোগ করুন" এ ট্যাপ করুন।',
  "View Transactions": "লেনদেন দেখুন",
  "Total earned this month:": "এই মাসে মোট আয়:",
  "Enter a total budget greater than zero": "শূন্যের চেয়ে বড় একটি মোট বাজেট লিখুন",
  "Total budget updated": "মোট বাজেট আপডেট হয়েছে",
  "Failed to update total budget": "মোট বাজেট আপডেট করা যায়নি",
  "Category deleted": "ক্যাটাগরি মুছে ফেলা হয়েছে",
  "Failed to delete category": "ক্যাটাগরি মুছে ফেলা যায়নি",
  'Delete the "{name}" category? This won\'t affect past transactions.': '"{name}" ক্যাটাগরিটি মুছে ফেলবেন? এটি অতীতের লেনদেনগুলোকে প্রভাবিত করবে না।',

  // src/components/budget/IncomeGoalModal.tsx
  "Edit Income Goal": "আয়ের লক্ষ্য সম্পাদনা করুন",
  "Add Income Goal": "আয়ের লক্ষ্য যোগ করুন",
  Month: "মাস",
  Year: "বছর",
  "Income Goal Amount": "আয়ের লক্ষ্যমাত্রা",
  "Add Goal": "লক্ষ্য যোগ করুন",
  "Enter a goal amount greater than zero": "শূন্যের চেয়ে বড় একটি লক্ষ্যমাত্রা লিখুন",
  "Income goal updated": "আয়ের লক্ষ্য আপডেট হয়েছে",
  "Income goal added": "আয়ের লক্ষ্য যোগ করা হয়েছে",
  "Failed to save the income goal": "আয়ের লক্ষ্য সংরক্ষণ করা যায়নি",

  // src/components/budget/MonthlyIncomeGoalPageClient.tsx
  "Monthly Income Goal": "মাসিক আয়ের লক্ষ্য",
  "Set an income target for any month and track how it's tracking against real income.":
    "যেকোনো মাসের জন্য একটি আয়ের লক্ষ্যমাত্রা নির্ধারণ করুন এবং প্রকৃত আয়ের বিপরীতে এর অগ্রগতি দেখুন।",
  Goal: "লক্ষ্য",
  Earned: "অর্জিত",
  Progress: "অগ্রগতি",
  'No goals set yet -- tap "Add Goal" to get started.': 'এখনো কোনো লক্ষ্য নির্ধারণ করা হয়নি -- শুরু করতে "লক্ষ্য যোগ করুন" এ ট্যাপ করুন।',
  "Income goal deleted": "আয়ের লক্ষ্য মুছে ফেলা হয়েছে",
  "Failed to delete the income goal": "আয়ের লক্ষ্য মুছে ফেলা যায়নি",
  "Delete the goal for {month} {year}?": "{month} {year} এর লক্ষ্যটি মুছে ফেলবেন?",
};
