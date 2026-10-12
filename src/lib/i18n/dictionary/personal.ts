// Bangla translations for: /referrals, /password-manager, and their
// components under src/components/referrals/ and
// src/components/password-vault/. (Settings/Workspace have their own
// dictionary/settings-workspace.ts.)
//
// Note: "Referrals" and "Password Manager" (page/heading text that's
// identical to the sidebar nav labels) are already translated in
// dictionary/chrome.ts and reused here via the same English key -- not
// redefined in this file.
export const personalDictionary: Record<string, string> = {
  // ReferralsPageClient.tsx
  "Referral Program": "রেফারেল প্রোগ্রাম",
  "Invite friends and earn rewards": "বন্ধুদের আমন্ত্রণ জানান এবং পুরস্কার অর্জন করুন",
  "Couldn't load your referral info -- please refresh.": "আপনার রেফারেল তথ্য লোড করা যায়নি -- দয়া করে রিফ্রেশ করুন।",
  "Your Referral Link": "আপনার রেফারেল লিংক",
  "Share this link with friends to earn rewards": "পুরস্কার অর্জনের জন্য বন্ধুদের সাথে এই লিংকটি শেয়ার করুন",
  "Copy Link": "লিংক কপি করুন",
  "Link copied": "লিংক কপি হয়েছে",
  WhatsApp: "হোয়াটসঅ্যাপ",
  "How It Works": "যেভাবে এটি কাজ করে",
  "Invite Friends": "বন্ধুদের আমন্ত্রণ জানান",
  "Share your unique referral link with friends and family": "আপনার নিজস্ব রেফারেল লিংক বন্ধু ও পরিবারের সাথে শেয়ার করুন",
  "They Sign Up": "তারা নিবন্ধন করেন",
  "When they create an account using your link, you both qualify for rewards":
    "তারা আপনার লিংক ব্যবহার করে অ্যাকাউন্ট তৈরি করলে, আপনারা দুজনেই পুরস্কারের জন্য যোগ্য হবেন",
  "Earn Rewards": "পুরস্কার অর্জন করুন",
  "You'll receive": "আপনি পাবেন",
  "credit for each friend who signs up and stays active for 30 days":
    "প্রতিটি বন্ধুর জন্য ক্রেডিট, যিনি নিবন্ধন করে ৩০ দিন সক্রিয় থাকেন",
  "Referral Program Terms": "রেফারেল প্রোগ্রামের শর্তাবলী",
  "Referral rewards are credited once your friend has been registered for 30 days.":
    "আপনার বন্ধুর নিবন্ধনের ৩০ দিন পূর্ণ হলে রেফারেল পুরস্কার জমা হয়।",
  "Your friend's account must still be active for the reward to count.": "পুরস্কার গণনার জন্য আপনার বন্ধুর অ্যাকাউন্ট অবশ্যই সক্রিয় থাকতে হবে।",
  "Rewards can be withdrawn to any of your General or Savings accounts.": "পুরস্কার আপনার যেকোনো সাধারণ বা সঞ্চয় হিসাবে উত্তোলন করা যাবে।",
  "There's no limit to how many friends you can refer.": "আপনি কতজন বন্ধুকে রেফার করতে পারবেন তার কোনো সীমা নেই।",
  "Earnings Overview": "আয়ের সারসংক্ষেপ",
  "Total Earned": "মোট অর্জিত",
  "Pending Earnings": "অমীমাংসিত আয়",
  // "Available Balance" now lives in dictionary/shared.ts (was duplicated
  // here with a different wording than savings-goals.ts's own copy).
  "Withdraw Funds": "তহবিল উত্তোলন করুন",
  "Recent Referrals": "সাম্প্রতিক রেফারেল",
  "No referrals yet.": "এখনো কোনো রেফারেল নেই।",
  // ReferralStatus labels (STATUS_LABELS) -- also reused for the plain
  // "Pending" fallback shown in place of a reward amount.
  Pending: "অমীমাংসিত",
  Confirmed: "নিশ্চিত",
  Withdrawn: "উত্তোলিত",

  // WithdrawReferralModal.tsx
  "Select an account to withdraw to": "উত্তোলনের জন্য একটি হিসাব নির্বাচন করুন",
  Withdrew: "উত্তোলন করা হয়েছে",
  "Failed to withdraw earnings": "আয় উত্তোলন ব্যর্থ হয়েছে",
  "Withdraw Referral Earnings": "রেফারেল আয় উত্তোলন করুন",
  // "Withdraw" (the bare word) is already in dictionary/shared.ts -- reused
  // here via that same key, not redefined.
  "to:": "যেখানে জমা হবে:",
  "General Accounts": "সাধারণ হিসাবসমূহ",
  "Savings Accounts": "সঞ্চয় হিসাবসমূহ",
  "No accounts yet": "এখনো কোনো হিসাব নেই",
  "No accounts exist in this workspace yet -- add one in Chart of Accounts first.":
    "এই ওয়ার্কস্পেসে এখনো কোনো হিসাব নেই -- প্রথমে চার্ট অফ অ্যাকাউন্টস-এ একটি যোগ করুন।",

  // PasswordVaultPageClient.tsx (incl. FILTER_PILLS and the category label
  // fallback, both sourced from vaultCategoryDisplay.ts's VAULT_CATEGORY_LABELS)
  "Securely store logins for your other accounts -- Facebook, bank, email and more":
    "আপনার অন্যান্য অ্যাকাউন্টের লগইন নিরাপদে সংরক্ষণ করুন -- ফেসবুক, ব্যাংক, ইমেইল এবং আরও অনেক কিছু",
  "Add Entry": "এন্ট্রি যোগ করুন",
  Lock: "লক করুন",
  All: "সব",
  Social: "সোশ্যাল",
  Bank: "ব্যাংক",
  Shopping: "শপিং",
  Work: "কাজ",
  Other: "অন্যান্য",
  "No entries saved yet -- click “Add Entry” to get started.": "এখনো কোনো এন্ট্রি সংরক্ষণ করা হয়নি -- শুরু করতে “এন্ট্রি যোগ করুন”-এ ক্লিক করুন।",
  "No entries in this category.": "এই ক্যাটাগরিতে কোনো এন্ট্রি নেই।",
  "Failed to reveal password": "পাসওয়ার্ড প্রদর্শন ব্যর্থ হয়েছে",
  "Entry deleted": "এন্ট্রি মুছে ফেলা হয়েছে",
  "Failed to delete entry": "এন্ট্রি মুছতে ব্যর্থ হয়েছে",
  "Failed to load vault entries": "ভল্ট এন্ট্রি লোড করতে ব্যর্থ হয়েছে",
  "Delete this entry?": "এই এন্ট্রিটি মুছে ফেলবেন?",
  "will be permanently removed from your vault.": "আপনার ভল্ট থেকে স্থায়ীভাবে মুছে ফেলা হবে।",

  // VaultEntryModal.tsx
  "Edit Entry": "এন্ট্রি সম্পাদনা করুন",
  "Title is required": "শিরোনাম আবশ্যক",
  "Password is required": "পাসওয়ার্ড আবশ্যক",
  "Entry updated": "এন্ট্রি আপডেট হয়েছে",
  "Entry saved": "এন্ট্রি সংরক্ষণ হয়েছে",
  "Failed to save entry": "এন্ট্রি সংরক্ষণ ব্যর্থ হয়েছে",
  Title: "শিরোনাম",
  "Username / Email": "ইউজারনেম / ইমেইল",
  "Website URL": "ওয়েবসাইট ইউআরএল",
  "(leave blank to keep unchanged)": "(অপরিবর্তিত রাখতে খালি রাখুন)",
  "e.g. Facebook, Dutch Bangla Bank": "যেমন: ফেসবুক, ডাচ বাংলা ব্যাংক",
  "Account holder's name": "হিসাবধারীর নাম",

  // VaultUnlockGate.tsx
  "Enter your account password": "আপনার অ্যাকাউন্ট পাসওয়ার্ড দিন",
  "Vault password must be at least 6 characters": "ভল্ট পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে",
  "Vault passwords don't match": "ভল্ট পাসওয়ার্ড মিলছে না",
  "Vault password set -- unlock below to continue": "ভল্ট পাসওয়ার্ড সেট হয়েছে -- চালিয়ে যেতে নিচে আনলক করুন",
  "Failed to set vault password": "ভল্ট পাসওয়ার্ড সেট করতে ব্যর্থ হয়েছে",
  "Enter your vault password": "আপনার ভল্ট পাসওয়ার্ড দিন",
  "Incorrect vault password": "ভুল ভল্ট পাসওয়ার্ড",
  "Set up your Vault Password": "আপনার ভল্ট পাসওয়ার্ড সেট করুন",
  "A separate password just for Password Manager, so it stays protected even if your account password ever leaks.":
    "শুধু পাসওয়ার্ড ম্যানেজারের জন্য আলাদা একটি পাসওয়ার্ড, যাতে আপনার অ্যাকাউন্ট পাসওয়ার্ড ফাঁস হলেও এটি সুরক্ষিত থাকে।",
  "Account Password": "অ্যাকাউন্ট পাসওয়ার্ড",
  "New Vault Password": "নতুন ভল্ট পাসওয়ার্ড",
  "Confirm Vault Password": "ভল্ট পাসওয়ার্ড নিশ্চিত করুন",
  "Set Vault Password": "ভল্ট পাসওয়ার্ড সেট করুন",
  "Enter Vault Password": "ভল্ট পাসওয়ার্ড দিন",
  "For your security, this is required every time you open Password Manager.":
    "আপনার নিরাপত্তার জন্য, পাসওয়ার্ড ম্যানেজার খোলার প্রতিবার এটি প্রয়োজন।",
  "Vault Password": "ভল্ট পাসওয়ার্ড",
  Unlock: "আনলক করুন",

  // VaultUnlockGate.tsx's "forgot vault password" recovery flow (a new
  // "reset" mode alongside loading/setup/unlock, reusing the setup form)
  "Forgot vault password?": "ভল্ট পাসওয়ার্ড ভুলে গেছেন?",
  "Reset your Vault Password": "আপনার ভল্ট পাসওয়ার্ড রিসেট করুন",
  "Confirm your account password to set a new vault password.": "নতুন ভল্ট পাসওয়ার্ড সেট করতে আপনার অ্যাকাউন্ট পাসওয়ার্ড নিশ্চিত করুন।",
  "Reset Vault Password": "ভল্ট পাসওয়ার্ড রিসেট করুন",
  "Vault password reset -- unlock below to continue": "ভল্ট পাসওয়ার্ড রিসেট হয়েছে -- চালিয়ে যেতে নিচে আনলক করুন",
  "Back to unlock": "আনলকে ফিরে যান",
};
