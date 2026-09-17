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
