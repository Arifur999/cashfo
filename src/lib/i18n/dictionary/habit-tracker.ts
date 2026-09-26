// Bangla translations for the "Habit Tracker" app-mode -- /habit-tracker and
// its sub-pages, plus TopBar.tsx's "Switch" button and Sidebar.tsx's own
// menu for this mode. Common words already covered by shared.ts/other
// per-area files (Cancel, Delete, Edit, Status, Actions, Name, Active,
// Archived, All, Dashboard, "(optional)", "Choose an Icon"/"Choose a
// Color"/icon-search strings, "Click to toggle", "This cannot be undone.")
// are deliberately NOT redefined here.
export const habitTrackerDictionary: Record<string, string> = {
  // TopBar.tsx
  Switch: "সুইচ",
  "Switch to Habit Tracker": "হ্যাবিট ট্র্যাকারে যান",
  "Switch to Money Tracker": "মানি ট্র্যাকারে ফিরে যান",

  // Sidebar.tsx (Habit Tracker mode)
  Habits: "অভ্যাসসমূহ",
  Calendar: "ক্যালেন্ডার",
  Stats: "পরিসংখ্যান",

  // Habit categories -- Sidebar's "Habits" submenu, HabitFormModal's
  // Category select, HabitsListPageClient's Category column. "Others"
  // reuses loan-management.ts's own key (same meaning, no redefinition).
  Namaz: "নামাজ",
  Ramadan: "রমজান",
  Book: "বই",
  Course: "কোর্স",

  // Weekday short labels -- HabitFormModal's day picker, HabitsListPageClient's
  // frequency column, HabitCalendarPageClient's grid header.
  Sun: "রবি",
  Mon: "সোম",
  Tue: "মঙ্গল",
  Wed: "বুধ",
  Thu: "বৃহঃ",
  Fri: "শুক্র",
  Sat: "শনি",

  // HabitFormModal.tsx
  "Add Habit": "অভ্যাস যোগ করুন",
  "Edit Habit": "অভ্যাস সম্পাদনা করুন",
  "Habit Name": "অভ্যাসের নাম",
  "e.g., Drink Water, Read, Exercise": "যেমন: পানি পান করা, বই পড়া, ব্যায়াম",
  "Give this habit a name": "এই অভ্যাসের একটি নাম দিন",
  Frequency: "কতবার",
  "Every day": "প্রতিদিন",
  "Specific days": "নির্দিষ্ট দিন",
  "N times a week": "সপ্তাহে N বার",
  "Pick at least one day": "অন্তত একটি দিন বাছাই করুন",
  "Times per week": "সপ্তাহে কতবার",
  Target: "লক্ষ্যমাত্রা",
  Unit: "একক",
  glasses: "গ্লাস",
  "Habit added": "অভ্যাস যোগ হয়েছে",
  "Habit updated": "অভ্যাস আপডেট হয়েছে",
  "Failed to save habit": "অভ্যাস সংরক্ষণ করতে ব্যর্থ হয়েছে",

  // HabitsListPageClient.tsx
  "Manage the habits you're tracking.": "আপনার ট্র্যাক করা অভ্যাসগুলো পরিচালনা করুন।",
  "x/week": "বার/সপ্তাহ",
  "No habits yet.": "এখনো কোনো অভ্যাস নেই।",
  "This habit has history, so it was archived instead": "এই অভ্যাসের হিস্টরি আছে, তাই এটি আর্কাইভ করা হয়েছে",
  "Habit removed": "অভ্যাস সরানো হয়েছে",
  "Failed to remove habit": "অভ্যাস সরাতে ব্যর্থ হয়েছে",
  "Failed to update habit": "অভ্যাস আপডেট করতে ব্যর্থ হয়েছে",
  "Remove Habit": "অভ্যাস সরান",

  // HabitDashboardPageClient.tsx
  "Today's Habits": "আজকের অভ্যাস",
  "Today's Progress": "আজকের অগ্রগতি",
  "Habits Today": "আজকের অভ্যাসসমূহ",
  "Best Streak": "সেরা স্ট্রিক",
  Checklist: "চেকলিস্ট",
  "No habits scheduled for today.": "আজকের জন্য কোনো অভ্যাস নির্ধারিত নেই।",
  "Add your first habit": "আপনার প্রথম অভ্যাস যোগ করুন",
  "day streak": "দিনের স্ট্রিক",
  Undo: "পূর্বাবস্থায় ফেরান",
  "Mark done": "সম্পন্ন হিসেবে চিহ্নিত করুন",

  // CreateMonthTrackerModal.tsx and the Namaz list cards -- "Create Month",
  // Tick / Cross. Month/Year/Remove/Cancel/Delete reuse existing keys.
  "Create Month": "মাস তৈরি করুন",
  "Month created": "মাস তৈরি হয়েছে",
  "Failed to create month tracker": "মাস তৈরি করতে ব্যর্থ হয়েছে",
  "Track your five daily prayers, month by month.": "মাসের পর মাস আপনার পাঁচ ওয়াক্ত নামাজের হিসাব রাখুন।",
  'No months yet -- click "Create Month" to start tracking.': 'এখনো কোনো মাস নেই -- শুরু করতে "মাস তৈরি করুন" ক্লিক করুন।',
  "Total Days": "মোট দিন",
  Tick: "টিক",
  Cross: "ক্রস",
  "Prayers not ticked on days that have already passed": "যে দিনগুলো পার হয়ে গেছে সেগুলোর টিক না দেওয়া ওয়াক্ত",
  "MashaAllah! Keep it up": "মাশাআল্লাহ! এভাবেই চালিয়ে যান",
  "Almost there, don't miss one": "প্রায় পৌঁছে গেছেন, একটাও মিস করবেন না",
  "Good effort, aim for more": "ভালো চেষ্টা, আরও ভালো করার লক্ষ্য রাখুন",
  "Needs attention, try to pray on time": "মনোযোগ দরকার, সময়মতো নামাজ পড়ার চেষ্টা করুন",
  "Don't give up, start with today": "হাল ছাড়বেন না, আজ থেকেই শুরু করুন",
  "Can't delete a month that has ticks -- untick them all first": "টিক দেওয়া আছে এমন মাস মোছা যাবে না -- আগে সব টিক তুলে নিন",
  "Prayer Summary": "ওয়াক্ত অনুযায়ী সারসংক্ষেপ",
  "Up to today": "আজ পর্যন্ত",
  Complete: "সম্পন্ন",
  Missing: "মিস",
  "Today counts once the day has passed.": "আজকের হিসাব দিন শেষ হলে যোগ হবে।",
  Day: "দিন",
  Week: "সপ্তাহ",
  Fajr: "ফজর",
  Dhuhr: "যোহর",
  Asr: "আসর",
  Maghrib: "মাগরিব",
  Isha: "এশা",
  "Failed to update": "আপডেট করতে ব্যর্থ হয়েছে",
  "Month tracker removed": "মাসের হিসাব সরানো হয়েছে",
  "Failed to remove month tracker": "মাসের হিসাব সরাতে ব্যর্থ হয়েছে",
  "Remove Month Tracker": "মাসের হিসাব সরান",
  "Remove the tracker for": "এই মাসের হিসাব সরান:",

  // Namaz pages (components/habit-tracker/namaz/) -- the sheet and the list
  // reuse most of the keys above and the Ramadan ones below.
  "All Months": "সব মাস",
  Prayers: "নামাজ",
  "Namaz Summary": "নামাজের সারসংক্ষেপ",
  "Friday (Jumu'ah)": "শুক্রবার (জুমা)",
  "This day hasn't come yet": "এই দিনটি এখনো আসেনি",
  "Days when all five prayers were ticked": "যেদিন পাঁচ ওয়াক্তই টিক দেওয়া হয়েছে",

  // Ramadan pages (components/habit-tracker/ramadan/). Habit names typed by
  // the user go through t() too and simply fall back to themselves.
  "Create Ramadan": "রমজান তৈরি করুন",
  "Track your Ramadan, day by day.": "দিনে দিনে আপনার রমজানের হিসাব রাখুন।",
  'No Ramadan yet -- click "Create Ramadan" to start.': 'এখনো কোনো রমজান নেই -- শুরু করতে "রমজান তৈরি করুন" ক্লিক করুন।',
  "Number of days": "দিনের সংখ্যা",
  "Ramadan is 29 or 30 days, depending on the moon sighting.": "চাঁদ দেখার উপর নির্ভর করে রমজান ২৯ বা ৩০ দিনের হয়।",
  "Ramadan created": "রমজান তৈরি হয়েছে",
  "Failed to create Ramadan": "রমজান তৈরি করতে ব্যর্থ হয়েছে",
  "Remove Ramadan": "রমজান সরান",
  "Ramadan removed": "রমজান সরানো হয়েছে",
  "Failed to remove Ramadan": "রমজান সরাতে ব্যর্থ হয়েছে",
  "Can't delete a Ramadan that has ticks -- untick them all first": "টিক দেওয়া আছে এমন রমজান মোছা যাবে না -- আগে সব টিক তুলে নিন",
  habit: "অভ্যাস",
  habits: "অভ্যাস",
  "All Ramadans": "সব রমজান",
  "Ramadan Summary": "রমজানের সারসংক্ষেপ",
  "Perfect days": "পূর্ণ দিন",
  "Best day": "সেরা দিন",
  "By habit": "অভ্যাস অনুযায়ী",
  "Days when every habit was ticked": "যেদিন সব অভ্যাস টিক দেওয়া হয়েছে",
  "Daily progress": "দৈনিক অগ্রগতি",
  "Add a habit (e.g. Quran)": "একটি অভ্যাস যোগ করুন (যেমন কুরআন)",
  Suggestions: "প্রস্তাবিত",
  "Remove habit": "অভ্যাস সরান",
  "Its ticks will be deleted too.": "এর সব টিকও মুছে যাবে।",
  "No habits yet -- add one below.": "এখনো কোনো অভ্যাস নেই -- নিচে থেকে যোগ করুন।",
  "Odd night of the last ten -- Laylat al-Qadr is sought in these": "শেষ দশকের বিজোড় রাত -- এই রাতগুলোতে লাইলাতুল কদর খোঁজা হয়",
  Rahmah: "রহমত",
  Maghfirah: "মাগফিরাত",
  Nijat: "নাজাত",
  Roza: "রোজা",
  Quran: "কুরআন",
  Hadis: "হাদিস",
  Dua: "দোয়া",
  Taraweeh: "তারাবিহ",
  Zikr: "জিকির",
  Sadaqah: "সদকা",
  Tahajjud: "তাহাজ্জুদ",

  // HabitCalendarPageClient.tsx
  "How many habits you completed each day.": "প্রতিদিন আপনি কতটি অভ্যাস সম্পন্ন করেছেন।",

  // HabitStatsPageClient.tsx
  "Streaks and completion rate over the last 30 days.": "গত ৩০ দিনের স্ট্রিক ও সম্পন্নের হার।",
  days: "দিন",
  completion: "সম্পন্ন",
};
