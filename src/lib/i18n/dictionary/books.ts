// Habits › My library (components/modules/Customer/HabitTracker/Books/).
// Title / Cancel / Save / Remove / Optional / Update / Edit / Close / of /
// days / Failed to update reuse existing keys (shared.ts or another area's
// file). Book titles and authors typed by the reader are shown as-is, NOT
// passed through t().
export const booksDictionary: Record<string, string> = {
  // Page
  "My Library": "আমার লাইব্রেরি",
  "My library": "আমার লাইব্রেরি",
  "Add book": "বই যোগ করুন",
  "Your shelf is empty, for now": "আপনার তাক এখন খালি, আপাতত",
  "Add the book you want to read next. It takes ten seconds.": "পরের যে বইটা পড়তে চান সেটা যোগ করুন। মাত্র দশ সেকেন্ড লাগে।",

  // Now reading
  "Now reading": "এখন পড়ছি",
  read: "পড়া হয়েছে",
  "{count} pages today": "আজ {count} পৃষ্ঠা",

  // Reading goal
  "Set a goal": "লক্ষ্য ঠিক করুন",
  "On pace": "ঠিক গতিতে",
  week: "সপ্তাহ",
  weeks: "সপ্তাহ",
  "How many books do you want to finish this year? A spine goes on the shelf for each one.": "এ বছর কয়টা বই শেষ করতে চান? প্রতিটির জন্য তাকে একটি বই উঠবে।",
  "Suggested goals": "প্রস্তাবিত লক্ষ্য",
  "Books to finish this year": "এ বছর শেষ করার বই",
  "Enter a number from 1 to 1000.": "১ থেকে ১০০০ এর মধ্যে একটা সংখ্যা দিন।",
  "Remove goal": "লক্ষ্য সরান",
  "Goal saved": "লক্ষ্য সংরক্ষিত হয়েছে",
  "Goal removed": "লক্ষ্য সরানো হয়েছে",
  "Failed to save goal": "লক্ষ্য সংরক্ষণ করতে ব্যর্থ হয়েছে",

  // Shelves
  Shelves: "তাকগুলো",
  Reading: "পড়ছি",
  "Want to read": "পড়তে চাই",
  Finished: "শেষ",
  pages: "পৃষ্ঠা",
  "See all": "সব দেখুন",
  actions: "কাজ",
  "Start reading": "পড়া শুরু করুন",
  "Read again": "আবার পড়ুন",
  "Edit book": "বই সম্পাদনা",
  "Remove book": "বই সরান",

  // Add / edit
  "Add a book": "একটা বই যোগ করুন",
  "Title, author and how many pages. The cover colour is yours to pick.": "নাম, লেখক আর কত পৃষ্ঠা। কভারের রং আপনার পছন্দ।",
  Author: "লেখক",
  "Total pages": "মোট পৃষ্ঠা",
  Shelf: "তাক",
  "Pages read so far": "এ পর্যন্ত পড়া পৃষ্ঠা",
  "Cover colour": "কভারের রং",
  "Your book title": "বইয়ের নাম",
  "e.g. Atomic Habits": "যেমন: পথের পাঁচালী",
  "You've already read more pages than this.": "আপনি এর চেয়ে বেশি পৃষ্ঠা ইতিমধ্যে পড়ে ফেলেছেন।",
  "That's more than the total pages.": "এটা মোট পৃষ্ঠার চেয়ে বেশি।",
  "Enter a number from 1 to 20000.": "১ থেকে ২০০০০ এর মধ্যে একটা সংখ্যা দিন।",
  Walnut: "আখরোট",
  Oxblood: "গাঢ় লাল",
  Forest: "বনসবুজ",
  Navy: "নেভি",
  Mustard: "সরিষা",
  Teal: "সবুজাভ নীল",
  Plum: "বেগুনি",
  Slate: "ধূসর",
  Terracotta: "টেরাকোটা",
  Sage: "হালকা সবুজ",
  "Book added": "বই যোগ হয়েছে",
  "Book updated": "বই আপডেট হয়েছে",
  "Failed to save book": "বই সংরক্ষণ করতে ব্যর্থ হয়েছে",
  "Book removed": "বই সরানো হয়েছে",
  "Failed to remove book": "বই সরাতে ব্যর্থ হয়েছে",

  // The reading streak (ReadingStreakCard.tsx, and the Today page's streaks)
  "Reading streak": "টানা পড়া",
  "{count}-day streak": "টানা {count} দিন",

  // Notes on a book (BookNotesCard.tsx)
  "{count} note": "{count}টি নোট",
  "{count} notes": "{count}টি নোট",
  "Keep the lines you like and your thoughts as you read.": "পড়তে পড়তে ভালো লাগা লাইন আর নিজের ভাবনা লিখে রাখুন।",
  "p. {page}": "পৃ. {page}",
  "Added today": "আজ যোগ হয়েছে",
  "Added {date}": "{date} যোগ হয়েছে",
  "Remove the note": "নোটটি মুছুন",
  "Show all {count}": "সব {count}টি দেখুন",
  "New note": "নতুন নোট",
  "Note removed": "নোট মোছা হয়েছে",
  "Failed to remove the note": "নোট মোছা যায়নি",
  "Remove this note?": "নোটটি মুছবেন?",

  // Counts and sentences in the reader's digits and word order.
  "We couldn't load your library just now.": "এই মুহূর্তে আপনার লাইব্রেরি লোড করা যায়নি।",
  "{year} reading goal": "{year} সালের পড়ার লক্ষ্য",
  "Remove \"{name}\"? Your progress on it will be lost.": "\"{name}\" সরাবেন? এর অগ্রগতি মুছে যাবে।",
  "started {date}": "{date} শুরু",
  "{count} pages a day": "দিনে {count} পৃষ্ঠা",
  "{count} pages left": "আর {count} পৃষ্ঠা বাকি",
  "{count} pages": "{count} পৃষ্ঠা",
  "See all {count}": "সব {count}টি দেখুন",
  "About one book a day to finish by December.": "ডিসেম্বরের মধ্যে শেষ করতে মোটামুটি প্রতিদিন একটি বই।",
  "About one book every {count} days to finish by December.": "ডিসেম্বরের মধ্যে শেষ করতে মোটামুটি প্রতি {count} দিনে একটি বই।",
  "About one book a week to finish by December.": "ডিসেম্বরের মধ্যে শেষ করতে মোটামুটি প্রতি সপ্তাহে একটি বই।",
  "About one book every {count} weeks to finish by December.": "ডিসেম্বরের মধ্যে শেষ করতে মোটামুটি প্রতি {count} সপ্তাহে একটি বই।",
  // The server's refusals (habitDisplay's actionError).
  "This book has {count} pages": "এই বইয়ে {count} পৃষ্ঠা",
  "You can keep up to {count} books": "সর্বোচ্চ {count}টি বই রাখা যায়",
  "Book not found": "বইটি পাওয়া যায়নি",
  "Note not found": "নোটটি পাওয়া যায়নি",
};
