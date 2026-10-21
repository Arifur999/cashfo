// Bangla translations for Home (/dashboard) and its components under
// src/components/modules/Customer/Dashboard/.
//
// Note: several words this page also uses (Transfer, Savings goals' "{saved}
// of {target}", Assets, Budget, Loans, Habits, Vault, Insights, Today, the
// prayer names, Streaks, Reading, Challenges, Not yet, Done, "{count} left",
// "{count} asset(s)", "{count} day(s)") are already translated in
// dictionary/chrome.ts and the feature dictionaries -- reused here via the
// same English key, not redefined, so the sidebar and this page never drift.
// A key this file shares with a dictionary spread after it (see
// dictionary.ts) would be dead here, so none is repeated.
//
// Every sentence is one key with {placeholders}, translated whole: Bangla
// puts "of", "in" and "than" after the words they belong to, so a sentence
// glued from separate words reads backwards.
export const dashboardDictionary: Record<string, string> = {
  "Good morning": "সুপ্রভাত",
  "Good afternoon": "শুভ অপরাহ্ন",
  "Good evening": "শুভ সন্ধ্যা",
  "Here is your day at a glance.": "এক নজরে আপনার আজকের দিন।",
  "Welcome to Smartly": "Smartly-তে স্বাগতম",
  "Three quick steps and Home fills itself in.": "তিনটি ছোট ধাপ, আর হোম নিজেই ভরে উঠবে।",

  // No workspace to open (HomeNoWorkspace.tsx)
  "No workspace to open yet": "খোলার মতো কোনো ওয়ার্কস্পেস এখনো নেই",
  "Your money, budgets and goals live in a workspace. Open your group's expenses, or create a workspace of your own.":
    "আপনার টাকা, বাজেট আর লক্ষ্য থাকে একটি ওয়ার্কস্পেসে। গ্রুপের খরচ খুলুন, অথবা নিজের একটি ওয়ার্কস্পেস তৈরি করুন।",
  "Your money, budgets and goals live in a workspace. Create one to start.": "আপনার টাকা, বাজেট আর লক্ষ্য থাকে একটি ওয়ার্কস্পেসে। শুরু করতে একটি তৈরি করুন।",
  "Open Group expenses": "গ্রুপ খরচ খুলুন",

  // A part that couldn't be read (HomePartError.tsx)
  "Couldn't load this part right now": "এই অংশটি এখন লোড করা যায়নি",
  "Couldn't load this part right now.": "এই অংশটি এখন লোড করা যায়নি।",

  // The hero (HomeHero.tsx)
  "This month · {month}": "এই মাস · {month}",
  "this month": "এই মাসে",
  wallet: "ওয়ালেট",
  wallets: "ওয়ালেট",
  "{count} wallet": "{count}টি ওয়ালেট",
  "{count} wallets": "{count}টি ওয়ালেট",
  "{change} vs {month}": "{month}-এর তুলনায় {change}",
  "Left over this month": "এই মাসে বাকি",
  "{amount} left over": "বাকি আছে {amount}",
  saved: "সঞ্চয়",
  "{rate}% saved": "{rate}% সঞ্চয়",
  "{rate}% of income saved this month": "এই মাসে আয়ের {rate}% সঞ্চয়",
  "No income this month yet": "এই মাসে এখনো কোনো আয় নেই",
  "Savings rate this month": "এই মাসের সঞ্চয়ের হার",
  "Add an income to see it": "দেখতে একটি আয় যোগ করুন",
  "First month on record": "হিসাবের প্রথম মাস",
  "No income in {month}": "{month}-এ কোনো আয় ছিল না",
  "Up from {rate}% in {month}": "{month}-এ ছিল {rate}%, এবার বেড়েছে",
  "Down from {rate}% in {month}": "{month}-এ ছিল {rate}%, এবার কমেছে",
  in: "-এ",

  // Money (HomeMoney.tsx, IncomeSavedChart.tsx, RecentTransactionsCard.tsx)
  "See all transactions": "সব লেনদেন দেখুন",
  "Income and what you kept": "আয় এবং যা রেখেছেন",
  "Last 6 months": "গত ৬ মাস",
  "{month}: income {income}, kept {kept}": "{month}: আয় {income}, রেখেছেন {kept}",
  "{month}: income {income}, {amount} more went out than came in": "{month}: আয় {income}, আয়ের চেয়ে {amount} বেশি খরচ",
  "Your income and what you keep show here after your first income.": "প্রথম আয়ের পর এখানে দেখা যাবে আপনার আয় আর তার কতটা রাখলেন।",
  "You kept {amount} in {month}, your best in six months.": "{month}-এ আপনি রেখেছেন {amount}, ছয় মাসের মধ্যে সেরা।",
  "You kept {amount} in {month}, less than in {other}.": "{month}-এ আপনি রেখেছেন {amount}, {other}-এর চেয়ে কম।",
  "You kept {amount} in {month}.": "{month}-এ আপনি রেখেছেন {amount}।",
  "In {month}, {amount} more went out than came in.": "{month}-এ আয়ের চেয়ে {amount} বেশি খরচ হয়েছে।",
  "Recent transactions": "সাম্প্রতিক লেনদেন",
  "Since {date}": "{date} থেকে",
  "No transactions yet.": "এখনো কোনো লেনদেন নেই।",
  "Savings goals": "সঞ্চয়ের লক্ষ্য",
  "{count} goal": "{count}টি লক্ষ্য",
  "{count} goals": "{count}টি লক্ষ্য",
  "{percent}% reached": "{percent}% পূরণ হয়েছে",
  "{percent}% of {amount}": "{amount}-এর {percent}%",
  "No assets yet": "এখনো কোনো সম্পদ নেই",
  "{change} since you bought them": "কেনার পর থেকে {change}",
  "No budget yet": "এখনো বাজেট নেই",
  "Set a monthly limit and Smartly warns you at 70%.": "মাসিক সীমা ঠিক করুন, ৭০%-এ Smartly সতর্ক করবে।",
  "{spent} of {limit}": "{limit}-এর মধ্যে {spent}",
  "{percent}% used": "{percent}% ব্যবহৃত",
  "{amount} left for {count} day": "{count} দিনের জন্য বাকি {amount}",
  "{amount} left for {count} days": "{count} দিনের জন্য বাকি {amount}",
  "{amount} left": "বাকি {amount}",
  "{amount} over": "সীমার চেয়ে {amount} বেশি",
  "{name} budget": "{name} বাজেট",
  "No goals yet": "এখনো লক্ষ্য নেই",
  "Set a monthly limit": "মাসিক সীমা ঠিক করুন",
  "Income & expense": "আয় ও ব্যয়",

  // Loans (HomeLoans.tsx). The section's own title: in Bangla the eyebrow
  // "Loans" already reads দেনা-পাওনা, and the English glosses teach English
  // readers the Bangla words a Bangla reader needs no gloss for.
  "Dena-pawna@@home": "কে কত পাবে, কে কত দেবে",
  "Open loans": "দেনা-পাওনা খুলুন",
  "Owed to you · pawna": "আপনার পাওনা",
  "You owe · dena": "আপনার দেনা",
  person: "জন",
  people: "জন",
  // Home's loan cards: Bangla puts the count first.
  "From {count} person": "{count} জনের কাছ থেকে",
  "From {count} people": "{count} জনের কাছ থেকে",
  "To {count} person": "{count} জনকে",
  "To {count} people": "{count} জনকে",
  "Active loans": "চলমান দেনা-পাওনা",
  "People and banks with a balance": "ব্যালেন্স আছে এমন ব্যক্তি ও ব্যাংক",

  // Habits (HomeHabits.tsx, HomeTodoCard.tsx, HomePhone.tsx)
  "Open habits": "অভ্যাস খুলুন",
  "{done} of {total} ticked today": "আজ {total}টির মধ্যে {done}টিতে টিক",
  "{done} of {total}": "{total}টির মধ্যে {done}টি",
  // The to-do list is করণীয় তালিকা in the menu; Home calls it the same.
  "Open to-do list": "করণীয় তালিকা খুলুন",
  "To-do": "করণীয়",
  "{count} running": "{count}টি চলছে",
  "Reading · {title}": "পড়ছি · {title}",
  "Page {read} of {total}": "{total} পৃষ্ঠার মধ্যে {read}",
  page: "পৃষ্ঠা",
  "Skills · {count} day": "দক্ষতা · {count} দিন",
  "Skills · {count} days": "দক্ষতা · {count} দিন",
  "Start learning a skill": "একটি দক্ষতা শেখা শুরু করুন",
  "Practised today": "আজ অনুশীলন হয়েছে",
  "Practise again today to keep it": "ধরে রাখতে আজও অনুশীলন করুন",
  "Practise today to start a streak": "ধারা শুরু করতে আজ অনুশীলন করুন",

  // The vault (HomeVaultInsights.tsx)
  Locked: "লক করা",
  login: "লগইন",
  logins: "লগইন",
  "{count} login": "{count}টি লগইন",
  "{count} logins": "{count}টি লগইন",
  "Not set up yet": "এখনো সেট আপ হয়নি",
  "Your logins are behind the vault password.": "আপনার লগইনগুলো ভল্ট পাসওয়ার্ডের পেছনে সুরক্ষিত।",
  "Keep every login behind its own vault password.": "প্রতিটি লগইন আলাদা ভল্ট পাসওয়ার্ডের পেছনে রাখুন।",
  "Unlock vault": "ভল্ট খুলুন",
  "Set up the vault": "ভল্ট সেট আপ করুন",
  "Vault locked": "ভল্ট লক করা",
  "Vault not set up": "ভল্ট সেট আপ হয়নি",

  // Insights (HomeVaultInsights.tsx, HomePhone.tsx)
  "What your numbers say": "আপনার সংখ্যাগুলো যা বলে",
  "Open insights": "ইনসাইটস খুলুন",
  "{name} is {percent}% of your income this month.": "এই মাসের আয়ের {percent}% এসেছে {name} থেকে।",
  "Your biggest source of money in.": "আপনার সবচেয়ে বড় আয়ের উৎস।",
  "{name} is your biggest spend: {percent}%.": "আপনার সবচেয়ে বড় খরচ {name}: {percent}%।",
  "{amount} this month.": "এই মাসে {amount}।",
  "{amount} this month, the same as this time in {month}.": "এই মাসে {amount}, {month}-এর এই সময়ের সমান।",
  "{amount} this month, {delta} less than this time in {month}.": "এই মাসে {amount}, {month}-এর এই সময়ের চেয়ে {delta} কম।",
  "{amount} this month, {delta} more than this time in {month}.": "এই মাসে {amount}, {month}-এর এই সময়ের চেয়ে {delta} বেশি।",
  "{name} is {percent}% of income": "আয়ের {percent}% {name} থেকে",
  "{name} is your biggest spend": "সবচেয়ে বড় খরচ {name}",
  "Nothing recorded in {month} yet.": "{month}-এ এখনো কিছু লেখা হয়নি।",
  "After a few transactions, Smartly explains them here.": "কয়েকটি লেনদেনের পর Smartly এখানে সেগুলো ব্যাখ্যা করবে।",
  "No insights yet": "এখনো কোনো ইনসাইট নেই",
  "After a few transactions": "কয়েকটি লেনদেনের পর",

  // Setup (HomeSetup.tsx)
  "Let's set up your money": "চলুন আপনার টাকা গুছিয়ে নিই",
  "{done} of {total} done": "{total}টির মধ্যে {done}টি শেষ",
  "takes about two minutes": "প্রায় দুই মিনিট লাগে",
  "Next step": "পরের ধাপ",
  // The step already done; the sign-up page's "Create your account"
  // (authDictionary.ts) is the button's, and keeps its own Bangla.
  "Create your account@@step": "অ্যাকাউন্ট তৈরি",
  "Done. Welcome aboard.": "হয়ে গেছে। স্বাগতম।",
  "Add your first wallet": "প্রথম ওয়ালেট যোগ করুন",
  "Cash, a bank account, bKash or Nagad.": "নগদ টাকা, ব্যাংক অ্যাকাউন্ট, বিকাশ বা নগদ।",
  "Ask the workspace owner to add a wallet.": "একটি ওয়ালেট যোগ করতে ওয়ার্কস্পেসের মালিককে বলুন।",
  "Add wallet": "ওয়ালেট যোগ করুন",
  "Add your first transaction": "প্রথম লেনদেন যোগ করুন",
  "An income or an expense from today.": "আজকের একটি আয় বা খরচ।",
  "Ask the workspace owner to add the first transaction.": "প্রথম লেনদেনটি যোগ করতে ওয়ার্কস্পেসের মালিককে বলুন।",
  "No transactions yet": "এখনো কোনো লেনদেন নেই",
  "Add your first income or expense to see it here.": "প্রথম আয় বা খরচ যোগ করলে এখানে দেখা যাবে।",
  "Plan a budget": "বাজেট করুন",
  "Your budget is planned": "আপনার বাজেট ঠিক করা আছে",
  "Smartly warns you when a category reaches 70%.": "কোনো ক্যাটাগরি ৭০%-এ পৌঁছালে Smartly সতর্ক করবে।",
  "See your budget": "বাজেট দেখুন",
  "Name something you are saving for and set a date.": "কিসের জন্য জমাচ্ছেন তার নাম দিন আর একটি তারিখ ঠিক করুন।",
  "Add a goal": "লক্ষ্য যোগ করুন",
  "Your savings goal is set": "আপনার সঞ্চয়ের লক্ষ্য ঠিক করা আছে",
  "Add money to it whenever you can.": "যখনই পারেন, এতে টাকা যোগ করুন।",
  "Open goals": "লক্ষ্যগুলো খুলুন",
  "Also in Smartly": "Smartly-তে আরও",
  "Ready when you are": "আপনি তৈরি হলেই",
  "Keep track of who owes you, and whom you owe.": "কে আপনার কাছে পায় আর আপনি কার কাছে দেন, হিসাব রাখুন।",
  "Add a person or bank": "ব্যক্তি বা ব্যাংক যোগ করুন",
};
