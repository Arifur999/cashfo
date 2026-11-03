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
  // Every customer drawer's submit while editing; the admin panel keeps
  // admin-shared.ts's পরিবর্তন সংরক্ষণ.
  "Save changes": "পরিবর্তন সংরক্ষণ করুন",
  // A save confirmation beside a form. The plain "Saved" is money put by
  // (জমা) in Savings.
  "Saved@@status": "সংরক্ষিত",
  // The button that opens something locked (the vault).
  Unlock: "আনলক করুন",
  // A card's preview in a drawer (the Wallet and Category drawers).
  Preview: "নমুনা",
  Delete: "মুছুন",
  Edit: "সম্পাদনা",
  Add: "যোগ করুন",
  Create: "তৈরি করুন",
  Update: "আপডেট",
  Search: "খুঁজুন",
  Close: "বন্ধ করুন",
  Submit: "জমা দিন",
  "Loading...": "লোড হচ্ছে...",
  // A failed action or a section that couldn't load (ErrorState)
  "Something went wrong": "কিছু একটা সমস্যা হয়েছে",
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
  "Page not found": "পেজ পাওয়া যায়নি",
  "It may have moved, or the link was typed wrong.": "এটি সরে গেছে, অথবা লিংকটি ভুল লেখা হয়েছে।",
  "It may have moved, or the link was typed wrong. If it was a transaction or a goal, it may have been deleted from another device.":
    "এটি সরে গেছে, অথবা লিংকটি ভুল লেখা হয়েছে। লেনদেন বা লক্ষ্য হলে অন্য ডিভাইস থেকে মুছে ফেলা হয়ে থাকতে পারে।",
  "Scheduled maintenance": "নির্ধারিত রক্ষণাবেক্ষণ",
  "Your data is safe. Everything is paused for a short while so nothing gets lost.":
    "আপনার তথ্য নিরাপদ আছে। কিছু যেন না হারায় সেজন্য অল্প সময়ের জন্য সবকিছু বন্ধ আছে।",
  "Write to support": "সাপোর্টকে লিখুন",
  "Message from the team": "টিমের বার্তা",
  // app/error.tsx
  "The server may be temporarily unavailable. Please try again in a moment.": "সার্ভার সাময়িকভাবে বন্ধ থাকতে পারে। একটু পরে আবার চেষ্টা করুন।",
  Name: "নাম",
  Email: "ইমেইল",
  Phone: "ফোন",
  Amount: "পরিমাণ",
  Date: "তারিখ",
  // The end of a date range ("From … To …").
  "To@@date": "পর্যন্ত",
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

  // The shared Pagination, LoadMore and list components. Customer pages say
  // পৃষ্ঠা where the admin panel says পাতা, and one pager must not mix the
  // two, so "Previous page" and "Next page" here win over income-expense.ts's
  // পাতা. The admin scope still takes admin-shared.ts's wording for the keys
  // it has.
  Pagination: "পৃষ্ঠা বদল",
  "Previous page": "আগের পৃষ্ঠা",
  "Next page": "পরের পৃষ্ঠা",
  "Earlier pages": "আগের পৃষ্ঠাগুলো",
  "Later pages": "পরের পৃষ্ঠাগুলো",
  "Page {page} of {total}": "পৃষ্ঠা {page} / {total}",
  "Go to page {page}": "পৃষ্ঠা {page}-এ যান",
  "Rows per page": "প্রতি পৃষ্ঠায় সারি",
  // The board writes a range as "54টির মধ্যে 1–20", with no verb.
  "Showing {range} of {total}": "{total}টির মধ্যে {range}",
  "Showing {shown} of {total}": "{total}টির মধ্যে {shown}টি দেখানো হচ্ছে",
  "Show {count} more": "আরও {count}টি দেখান",
  "Show fewer": "কম দেখান",
  // A list's order, as a sort choice or a note under its title, the way
  // the pages' sentences say it ("…, নতুনগুলো আগে").
  "Newest first": "নতুনগুলো আগে",
  // A paged statement's first and last rows: the running balance from the
  // pages before, and the one the next page starts from (as the loan
  // statement words it).
  "Brought forward": "এগিয়ে আনা ব্যালেন্স",
  "Carried forward": "এগিয়ে নেওয়া ব্যালেন্স",

  // The customer top bar's search palette (Ctrl K): app screens are পেজ, as
  // "Page not found" says it; the pagers' পৃষ্ঠা is a page of a list.
  "Search pages, people, transactions": "পেজ, মানুষ, লেনদেন খুঁজুন",
  "Search pages, people, transactions…": "পেজ, মানুষ, লেনদেন খুঁজুন…",
  "Finds pages, actions, people and transactions": "পেজ, কাজ, মানুষ ও লেনদেন খুঁজে দেয়",
  "Type 2 letters or more to find people and transactions": "মানুষ ও লেনদেন খুঁজতে অন্তত ২টি অক্ষর লিখুন",
  Recent: "সাম্প্রতিক",
  Pages: "পেজ",
  "Switch workspace": "ওয়ার্কস্পেস বদলান",
  "Change language": "ভাষা বদলান",
  "Change theme": "থিম বদলান",
  "See all matching transactions": "মিলে যাওয়া সব লেনদেন দেখুন",
  // The bell, when marking everything read fails.
  "Failed to mark the notifications as read": "নোটিফিকেশনগুলো পড়া হয়েছে বলে চিহ্নিত করা যায়নি",

  // The menu's words, as the AppSidebar board's Bangla has them. Area files
  // define some of them too (habit-tracker.ts, balance.ts, referrals.ts,
  // todos.ts) and used to win; this file spreads last, so the menu, the
  // breadcrumb, the tab titles and the pages read the same word.
  Habits: "অভ্যাস",
  Accounts: "হিসাব",
  "Invite & earn": "আমন্ত্রণ করে আয়",
  "To-do list": "করণীয় তালিকা",
  // Loans › Payments; the admin panel keeps its own পেমেন্ট.
  Payments: "পরিশোধ",

  // The error pages' reference line, as one sentence.
  "Error reference: {digest}": "এরর রেফারেন্স: {digest}",
  // The root layout's skip link; <html lang> follows the locale cookie.
  "Skip to main content": "মূল অংশে যান",
  // attempt()'s answer when a server action belongs to an older build.
  "Smartly was just updated. Reload the page and try again.": "Smartly এইমাত্র আপডেট হয়েছে। পেজটি আবার লোড করে চেষ্টা করুন।",
  // Six-digit codes sent by SMS (CodeStep, codeProblem, the vault reset, the withdrawal).
  "We sent a 6-digit code by SMS to {phone}. It works for 10 minutes.": "{phone}-এ ৬ সংখ্যার একটি কোড SMS করেছি। এটি ১০ মিনিট কাজ করবে।",
  "We sent a new code to {phone}.": "{phone}-এ নতুন কোড পাঠিয়েছি।",
  "Text messages cannot be sent right now. Please try again later.": "এখন SMS পাঠানো যাচ্ছে না। পরে আবার চেষ্টা করুন।",
  "We couldn't send the code. Please try again in a minute.": "কোড পাঠানো যায়নি। এক মিনিট পরে আবার চেষ্টা করুন।",
  "We couldn't send the code. Please try again.": "কোড পাঠানো যায়নি। আবার চেষ্টা করুন।",
  "We couldn't check the code. Please try again.": "কোড মেলানো যায়নি। আবার চেষ্টা করুন।",
  "Use a Bangladeshi mobile number, like 01712-345678.": "বাংলাদেশের মোবাইল নম্বর দিন, যেমন 01712-345678।",
  "This number is already verified on another account.": "এই নম্বর অন্য একটি অ্যাকাউন্টে আগেই যাচাই করা আছে।",
  "The number changed after the code was sent. Start again.": "কোড পাঠানোর পর নম্বর বদলেছে। আবার শুরু করুন।",
  "This number is already verified.": "এই নম্বর আগেই যাচাই করা আছে।",
  "Add your phone number first.": "আগে আপনার ফোন নম্বর যোগ করুন।",
  "Code from the SMS": "SMS-এর কোড",
  "We sent a 6-digit code by SMS to {phone}. Enter it to finish. It works for 10 minutes.": "{phone}-এ ৬ সংখ্যার একটি কোড SMS করেছি। শেষ করতে কোডটি দিন। এটি ১০ মিনিট কাজ করবে।",
  "We sent a 6-digit code by SMS to {email}. Enter it to send {amount} to {destination}.": "{email}-এ ৬ সংখ্যার একটি কোড SMS করেছি। {destination}-এ {amount} পাঠাতে কোডটি দিন।",
  // ---- The report pages' "Choose period" (Shared/PeriodPicker)
  "Type a year first.": "আগে একটা বছর লিখুন।",
  "No data found for {year}.": "{year} সালের কোনো তথ্য পাওয়া যায়নি।",
  "Greyed-out months have no data.": "ধূসর মাসগুলোতে কোনো তথ্য নেই।",
  "Months after this one are greyed out.": "এই মাসের পরের মাসগুলো ধূসর।",
  "Years with data": "যেসব বছরে তথ্য আছে",
  "Recent years": "সাম্প্রতিক বছর",
  "The “From” date must be on or before the “To” date.": "“থেকে” তারিখটা “পর্যন্ত” তারিখের আগে বা একই দিন হতে হবে।",
};
