// Common words/phrases reused across EVERY feature area (shared UI
// primitives like DatePicker/Combobox/ConfirmModal, plus generic
// buttons/labels every page needs). Centralized here, rather than
// duplicated per-area, so two areas never independently invent DIFFERENT
// Bangla translations for the same English word (the merge in
// dictionary.ts is one flat namespace keyed by the English string -- a
// collision would silently let whichever area's dictionary spreads last
// win everywhere, not just in that area). Every other dictionary/*.ts file
// should reuse these exact translations for these exact words rather than
// redefining them.
export const sharedDictionary: Record<string, string> = {
  // src/components/ui/DatePicker.tsx
  January: "জানুয়ারি",
  February: "ফেব্রুয়ারি",
  March: "মার্চ",
  April: "এপ্রিল",
  May: "মে",
  June: "জুন",
  July: "জুলাই",
  August: "আগস্ট",
  September: "সেপ্টেম্বর",
  October: "অক্টোবর",
  November: "নভেম্বর",
  December: "ডিসেম্বর",
  Su: "রবি",
  Mo: "সোম",
  Tu: "মঙ্গল",
  We: "বুধ",
  Th: "বৃহ",
  Fr: "শুক্র",
  Sa: "শনি",
  "Select a date": "একটি তারিখ নির্বাচন করুন",

  // src/components/ui/Combobox.tsx, ConfirmModal.tsx
  "No matches": "কোনো মিল পাওয়া যায়নি",
  Cancel: "বাতিল",
  Confirm: "নিশ্চিত করুন",

  // Generic buttons/labels -- reuse these exact keys/values in every area,
  // don't redefine with different Bangla wording.
  Save: "সংরক্ষণ",
  "Save Changes": "পরিবর্তন সংরক্ষণ করুন",
  Delete: "মুছুন",
  Edit: "সম্পাদনা",
  Add: "যোগ করুন",
  Create: "তৈরি করুন",
  Update: "আপডেট",
  Search: "খুঁজুন",
  Close: "বন্ধ করুন",
  Submit: "জমা দিন",
  "Loading...": "লোড হচ্ছে...",
  // app/(customerLayout)/error.tsx
  "Something went wrong": "কিছু একটা সমস্যা হয়েছে",
  "We couldn't load this page. Check your connection and try again.": "পেজটি লোড করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।",
  "Reference:": "রেফারেন্স:",
  "Try again": "আবার চেষ্টা করুন",
  "Check your internet and try again. Nothing was lost.": "ইন্টারনেট দেখে আবার চেষ্টা করুন। কিছুই হারায়নি।",
  // The message pages: error.tsx, not-found.tsx, maintenance
  "Error reference": "এরর রেফারেন্স",
  "Something went wrong on our side": "আমাদের দিকে কিছু একটা ভুল হয়েছে",
  "Nothing you entered was lost. Try again in a moment; if it keeps happening, send us the reference above and we will look into it.":
    "আপনার লেখা কিছুই হারায়নি। একটু পরে আবার চেষ্টা করুন; বারবার হলে উপরের রেফারেন্সটি আমাদের পাঠান, আমরা দেখব।",
  "Go to Home": "হোমে যান",
  "Saved transactions stay saved. Anything you were typing may need to be entered again.": "সংরক্ষিত লেনদেন সংরক্ষিতই থাকে। যা লিখছিলেন তা আবার লিখতে হতে পারে।",
  "We can't find that page": "পেজটি খুঁজে পাচ্ছি না",
  "It may have moved, or the link was typed wrong.": "এটি সরে গেছে, অথবা লিংকটি ভুল লেখা হয়েছে।",
  "It may have moved, or the link was typed wrong. If it was a transaction or a goal, it may have been deleted from another device.":
    "এটি সরে গেছে, অথবা লিংকটি ভুল লেখা হয়েছে। লেনদেন বা লক্ষ্য হলে অন্য ডিভাইস থেকে মুছে ফেলা হয়ে থাকতে পারে।",
  "Scheduled maintenance": "নির্ধারিত রক্ষণাবেক্ষণ",
  "is getting an upgrade": "আপগ্রেড হচ্ছে",
  "Your data is safe and you can still read everything. Changes are paused for a short while so nothing gets lost.":
    "আপনার তথ্য নিরাপদ এবং সবকিছু দেখতে পারবেন। কিছু যেন না হারায় সেজন্য অল্প সময়ের জন্য পরিবর্তন বন্ধ আছে।",
  "Write to support": "সাপোর্টকে লিখুন",
  "Message from the team": "টিমের বার্তা",
  // app/error.tsx
  "The server may be temporarily unavailable. Please try again in a moment.": "সার্ভার সাময়িকভাবে বন্ধ থাকতে পারে। একটু পরে আবার চেষ্টা করুন।",
  Name: "নাম",
  Email: "ইমেইল",
  Phone: "ফোন",
  Amount: "পরিমাণ",
  Date: "তারিখ",
  Description: "বিবরণ",
  Notes: "নোট",
  "Notes (optional)": "নোট (ঐচ্ছিক)",
  Status: "স্ট্যাটাস",
  Actions: "কার্যক্রম",
  Optional: "ঐচ্ছিক",
  Yes: "হ্যাঁ",
  No: "না",
  Total: "মোট",
  Balance: "ব্যালেন্স",
  // Used generically across Balance Overview, Savings Goals, and Referrals
  // -- moved here (was duplicated in dictionary/savings-goals.ts and
  // dictionary/personal.ts with two different Bangla wordings) so every
  // area gets the same translation instead of whichever file's spread
  // order happened to win.
  "Available Balance": "উপলব্ধ ব্যালেন্স",
  Account: "হিসাব",
  Currency: "মুদ্রা",
  Active: "সক্রিয়",
  Inactive: "নিষ্ক্রিয়",
  View: "দেখুন",
  "View Details": "বিস্তারিত দেখুন",
  Details: "বিস্তারিত",
  Back: "পেছনে",
  Next: "পরবর্তী",
  Previous: "পূর্ববর্তী",
  Filter: "ফিল্টার",
  Export: "এক্সপোর্ট",
  Type: "ধরন",
  Category: "ক্যাটাগরি",
  Password: "পাসওয়ার্ড",
  Address: "ঠিকানা",
  Income: "আয়",
  Expense: "ব্যয়",
  Deposit: "জমা",
  Withdraw: "উত্তোলন",
  "Opening Balance": "প্রারম্ভিক ব্যালেন্স",
  "Current Balance": "বর্তমান ব্যালেন্স",
  "No data found": "কোনো তথ্য পাওয়া যায়নি",
  "Are you sure?": "আপনি কি নিশ্চিত?",
  Success: "সফল",
  Failed: "ব্যর্থ",
  Error: "ত্রুটি",
};
