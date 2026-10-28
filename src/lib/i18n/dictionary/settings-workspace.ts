// Bangla translations for: /settings, /settings/workspaces, and their
// components under src/components/settings/ and src/components/workspace/.
// The profile, photo and password messages, "Workspaces" and the workspace
// delete messages are worded in settings.ts alone.
export const settingsWorkspaceDictionary: Record<string, string> = {
  // src/components/settings/SettingsPageClient.tsx
  Security: "নিরাপত্তা",
  App: "অ্যাপ",
  "Coming soon": "শীঘ্রই আসছে",

  // src/components/settings/SecurityTab.tsx
  "Sign out": "সাইন আউট",
  "Device signed out": "ডিভাইস সাইন আউট হয়েছে",
  "Failed to sign out that device": "সেই ডিভাইসটি সাইন আউট করতে ব্যর্থ হয়েছে",
  Devices: "ডিভাইস",
  History: "ইতিহাস",
  "No active sessions found.": "কোনো সক্রিয় সেশন পাওয়া যায়নি।",
  "Active now": "এখন সক্রিয়",
  "Last active": "সর্বশেষ সক্রিয়",
  "Signing out...": "সাইন আউট হচ্ছে...",
  "No login history yet.": "এখনো কোনো লগইন ইতিহাস নেই।",
  "Suspicious Activity": "সন্দেহজনক কার্যকলাপ",

  // src/components/workspace/CreateWorkspaceModal.tsx
  "Workspace created": "ওয়ার্কস্পেস তৈরি হয়েছে",
  "Failed to create workspace": "ওয়ার্কস্পেস তৈরি করতে ব্যর্থ হয়েছে",
  "New Business Workspace": "নতুন ব্যবসায়িক ওয়ার্কস্পেস",
  "Your current plan does not include business workspaces. Upgrade to add one.":
    "আপনার বর্তমান প্ল্যানে ব্যবসায়িক ওয়ার্কস্পেস অন্তর্ভুক্ত নেই। একটি যোগ করতে আপগ্রেড করুন।",
  "Your plan allows up to {count} business workspaces. Upgrade to add more.": "আপনার প্ল্যান সর্বোচ্চ {count}টি ব্যবসায়িক ওয়ার্কস্পেসের অনুমতি দেয়। আরও যোগ করতে আপগ্রেড করুন।",
  "e.g. My Shop": "যেমন: আমার দোকান",
  PIN: "পিন",
  "Optional -- set a PIN to require it when switching into this workspace.":
    "ঐচ্ছিক -- এই ওয়ার্কস্পেসে প্রবেশের সময় প্রয়োজনীয় একটি পিন সেট করুন।",
  "4-6 digits": "৪-৬ সংখ্যা",

  // src/components/workspace/EditWorkspaceModal.tsx
  "Workspace updated": "ওয়ার্কস্পেস আপডেট হয়েছে",
  "Failed to update workspace": "ওয়ার্কস্পেস আপডেট করতে ব্যর্থ হয়েছে",
  "Edit Workspace": "ওয়ার্কস্পেস সম্পাদনা করুন",

  // What POST and PATCH /api/businesses refuse with; both dialogs toast
  // the message through t(). The 50 is MAX_WORKSPACES_PER_USER in the
  // backend's businesses.service.ts.
  "You can have at most 50 workspaces besides your personal one. Delete one you no longer use first.":
    "ব্যক্তিগতটি ছাড়া সর্বোচ্চ ৫০টি ওয়ার্কস্পেস রাখা যায়। আগে অদরকারি একটি মুছে ফেলুন।",
  "This already exists": "এটি আগে থেকেই আছে",
  "PIN must be 4 to 6 digits": "পিন ৪ থেকে ৬ সংখ্যার হতে হবে",
  "Workspace not found": "ওয়ার্কস্পেস পাওয়া যায়নি",
  "Only the workspace owner can do this": "শুধু ওয়ার্কস্পেসের মালিক এটি করতে পারেন",
  "Change PIN": "পিন পরিবর্তন করুন",
  "Leave blank to keep the current PIN unchanged.": "বর্তমান পিন অপরিবর্তিত রাখতে খালি রাখুন।",

  // src/components/workspace/PinPromptModal.tsx
  "Failed to verify PIN": "পিন যাচাই করতে ব্যর্থ হয়েছে",
  "Incorrect PIN, try again.": "ভুল পিন, আবার চেষ্টা করুন।",
  Unlock: "আনলক",

  // src/components/workspace/EditWorkspaceModal.tsx -- setting or removing the lock
  "Set a PIN": "একটি পিন সেট করুন",
  "Asked before this workspace opens on any device. Leave blank for no PIN.":
    "যেকোনো ডিভাইসে এই ওয়ার্কস্পেস খোলার আগে পিন চাওয়া হবে। পিন না চাইলে খালি রাখুন।",
  "Remove the PIN": "পিন সরিয়ে দিন",

  // src/components/workspace/WorkspaceLockScreen.tsx
  "Enter your account password to remove the PIN.": "পিন সরাতে আপনার অ্যাকাউন্টের পাসওয়ার্ড লিখুন।",
  "Account password": "অ্যাকাউন্টের পাসওয়ার্ড",
  "Remove PIN": "পিন সরান",
  "Forgot PIN?": "পিন ভুলে গেছেন?",
  "Enter PIN instead": "বরং পিন লিখুন",
  "Ask the workspace owner for the PIN.": "পিনের জন্য ওয়ার্কস্পেসের মালিককে জিজ্ঞাসা করুন।",
  "Failed to remove the PIN": "পিন সরাতে ব্যর্থ হয়েছে",

  // src/components/Layout/UserMenu.tsx
  "Lock workspace": "ওয়ার্কস্পেস লক করুন",

  // src/components/Layout/OwnerViewBanner.tsx (an admin's read-only view)
  "Viewing as": "যার হিসেবে দেখছেন:",
  "read-only support view by": "শুধু দেখার জন্য সাপোর্ট ভিউ, খুলেছেন",
  "End view": "ভিউ বন্ধ করুন",

  // src/components/workspace/WorkspaceSettingsPage.tsx
  "This cannot be undone.": "এটি পূর্বাবস্থায় ফেরানো যাবে না।",
  Default: "ডিফল্ট",
  Trial: "ট্রায়াল",
  "Trial expired": "ট্রায়াল মেয়াদ শেষ",

  // src/components/workspace/WorkspaceSwitcher.tsx
  Personal: "ব্যক্তিগত",
  "New workspace": "নতুন ওয়ার্কস্পেস",

  // src/components/modules/Customer/Workspace/ChooseWorkspaceClient.tsx
  // ("{count} wallet" and "{count} wallets" are worded in dashboard.ts)
  "Trial — {count} day left": "ট্রায়াল — আর {count} দিন বাকি",
  "Trial — {count} days left": "ট্রায়াল — আর {count} দিন বাকি",
  day: "দিন",
  days: "দিন",
  left: "বাকি",

  // The Smartly workspace chooser, PIN dialog and lock screen
  "Which workspace?": "কোন ওয়ার্কস্পেস?",
  "Each workspace keeps its own money and books. You can come back here any time from your name at the top right.":
    "প্রতিটি ওয়ার্কস্পেসের নিজস্ব টাকা ও খাতা আছে। উপরে ডানে আপনার নাম থেকে যেকোনো সময় এখানে ফিরতে পারবেন।",
  "PIN lock": "পিন লক",
  Owner: "মালিক",
  Accountant: "হিসাবরক্ষক",
  Staff: "কর্মী",
  "A personal or business workspace. Each keeps its own books.": "ব্যক্তিগত বা ব্যবসায়িক ওয়ার্কস্পেস। প্রতিটির নিজস্ব খাতা।",
  "Mess and family groups open from {place} inside any workspace.": "মেস ও পরিবারের গ্রুপ যেকোনো ওয়ার্কস্পেসের ভেতরে {place} থেকে খোলা যায়।",
  Open: "খুলুন",
  "Enter the PIN for {name}": "{name}-এর পিন লিখুন",
  "Open workspace": "ওয়ার্কস্পেস খুলুন",
  "{name} has a PIN so others using this device can't open its books.": "{name}-এ পিন দেওয়া আছে, যাতে এই ডিভাইসের অন্য কেউ এর খাতা খুলতে না পারে।",
  "Remove the PIN with your account password": "অ্যাকাউন্টের পাসওয়ার্ড দিয়ে পিন সরান",
  "Forgot the PIN?": "পিন ভুলে গেছেন?",
  "Reset it with your account password": "অ্যাকাউন্টের পাসওয়ার্ড দিয়ে রিসেট করুন",
  "Open the app": "অ্যাপ খুলুন",
  "Privacy policy": "গোপনীয়তা নীতি",
  "Refund policy": "রিফান্ড নীতি",
  "Common questions": "সাধারণ জিজ্ঞাসা",
  "just now": "এইমাত্র",
  "{count} minute ago": "{count} মিনিট আগে",
  "{count} minutes ago": "{count} মিনিট আগে",
  "{count} hour ago": "{count} ঘণ্টা আগে",
  "{count} hours ago": "{count} ঘণ্টা আগে",
  "{count} day ago": "{count} দিন আগে",
  "{count} days ago": "{count} দিন আগে",

  // Switching workspaces: the account menu, the phone drawer, Settings ›
  // Workspaces, the chooser, the lock screen and the Books notice
  "See all workspaces": "সব ওয়ার্কস্পেস দেখুন",
  "Switched to {name}": "{name} খোলা হয়েছে",
  "Couldn't open that workspace. Please try again.": "ওয়ার্কস্পেসটি খোলা যায়নি। আবার চেষ্টা করুন।",
  "That workspace isn't available any more.": "এই ওয়ার্কস্পেসটি আর পাওয়া যাচ্ছে না।",
  "Open it now": "এখনই খুলুন",
  "Use another workspace": "অন্য ওয়ার্কস্পেস ব্যবহার করুন",
  "Choose a workspace": "ওয়ার্কস্পেস বেছে নিন",
  "Workspace locked": "ওয়ার্কস্পেস লক করা",
  "Books live in a business workspace": "খাতা থাকে ব্যবসায়িক ওয়ার্কস্পেসে",
  "Accounts, customers and suppliers, receivables and payables and journal entries are kept in a business workspace, apart from your personal money.":
    "হিসাব, ক্রেতা ও সরবরাহকারী, বকেয়া প্রাপ্য ও দেয় আর জার্নাল এন্ট্রি থাকে ব্যবসায়িক ওয়ার্কস্পেসে, আপনার ব্যক্তিগত টাকা থেকে আলাদা।",
  "Create a business workspace": "ব্যবসায়িক ওয়ার্কস্পেস তৈরি করুন",
  "Go home": "হোমে যান",
};
