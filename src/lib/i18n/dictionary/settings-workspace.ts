// Bangla translations for: /settings, /settings/workspaces, and their
// components under src/components/settings/ and src/components/workspace/.
export const settingsWorkspaceDictionary: Record<string, string> = {
  // src/components/settings/SettingsPageClient.tsx
  Security: "নিরাপত্তা",
  App: "অ্যাপ",
  "Coming soon": "শীঘ্রই আসছে",

  // src/components/settings/ProfileTab.tsx
  "Profile updated": "প্রোফাইল আপডেট হয়েছে",
  "Failed to update profile": "প্রোফাইল আপডেট করতে ব্যর্থ হয়েছে",
  "Failed to update password": "পাসওয়ার্ড আপডেট করতে ব্যর্থ হয়েছে",

  // src/components/settings/ChangeAvatarModal.tsx
  "Only JPG, PNG, WEBP, or GIF images are allowed": "শুধুমাত্র JPG, PNG, WEBP, বা GIF ছবি অনুমোদিত",
  "Image must be 5MB or smaller": "ছবিটি অবশ্যই 5MB বা তার কম হতে হবে",
  "Failed to upload avatar": "অ্যাভাটার আপলোড করতে ব্যর্থ হয়েছে",

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
  "Your plan allows up to": "আপনার প্ল্যান সর্বোচ্চ",
  "business workspace(s). Upgrade to add more.": "টি ব্যবসায়িক ওয়ার্কস্পেসের অনুমতি দেয়। আরও যোগ করতে আপগ্রেড করুন।",
  "e.g. My Shop": "যেমন: আমার দোকান",
  PIN: "পিন",
  "Optional -- set a PIN to require it when switching into this workspace.":
    "ঐচ্ছিক -- এই ওয়ার্কস্পেসে প্রবেশের সময় প্রয়োজনীয় একটি পিন সেট করুন।",
  "4-6 digits": "৪-৬ সংখ্যা",

  // src/components/workspace/EditWorkspaceModal.tsx
  "Workspace updated": "ওয়ার্কস্পেস আপডেট হয়েছে",
  "Failed to update workspace": "ওয়ার্কস্পেস আপডেট করতে ব্যর্থ হয়েছে",
  "Edit Workspace": "ওয়ার্কস্পেস সম্পাদনা করুন",
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
  "Workspace deleted": "ওয়ার্কস্পেস মুছে ফেলা হয়েছে",
  "Failed to delete workspace": "ওয়ার্কস্পেস মুছতে ব্যর্থ হয়েছে",
  Workspaces: "ওয়ার্কস্পেসসমূহ",
  Default: "ডিফল্ট",
  Trial: "ট্রায়াল",
  "Trial expired": "ট্রায়াল মেয়াদ শেষ",

  // src/components/workspace/WorkspaceSwitcher.tsx
  Personal: "ব্যক্তিগত",
  "New workspace": "নতুন ওয়ার্কস্পেস",

  // src/components/workspace/ChooseWorkspaceClient.tsx
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
  "Mess and family groups open from": "মেস ও পরিবারের গ্রুপ খোলে",
  "inside any workspace.": "থেকে, যেকোনো ওয়ার্কস্পেসের ভেতরে।",
  Open: "খুলুন",
  "Enter the PIN for": "পিন লিখুন:",
  "has a PIN so others using this device can't open its books.": "-এ পিন দেওয়া আছে, যাতে এই ডিভাইসের অন্য কেউ এর খাতা খুলতে না পারে।",
  "Remove the PIN with your account password": "অ্যাকাউন্টের পাসওয়ার্ড দিয়ে পিন সরান",
  "Forgot the PIN?": "পিন ভুলে গেছেন?",
  "Reset it with your account password": "অ্যাকাউন্টের পাসওয়ার্ড দিয়ে রিসেট করুন",
  "Open the app": "অ্যাপ খুলুন",
  "Terms of use": "ব্যবহারের শর্তাবলি",
  "Privacy policy": "গোপনীয়তা নীতি",
  "Refund policy": "রিফান্ড নীতি",
  "Common questions": "সাধারণ জিজ্ঞাসা",
};
