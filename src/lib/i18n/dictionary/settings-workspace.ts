// Bangla translations for: /settings, /settings/workspaces, and their
// components under src/components/settings/ and src/components/workspace/.
export const settingsWorkspaceDictionary: Record<string, string> = {
  // src/components/settings/SettingsPageClient.tsx
  Security: "নিরাপত্তা",
  "Manage your account settings and preferences": "আপনার অ্যাকাউন্টের সেটিংস ও পছন্দসমূহ পরিচালনা করুন",
  App: "অ্যাপ",
  Help: "সহায়তা",
  Resources: "রিসোর্স",
  "Coming soon": "শীঘ্রই আসছে",

  // src/components/settings/ProfileTab.tsx
  "First name can't be empty": "প্রথম নাম খালি রাখা যাবে না",
  "Profile updated": "প্রোফাইল আপডেট হয়েছে",
  "Failed to update profile": "প্রোফাইল আপডেট করতে ব্যর্থ হয়েছে",
  "Fill in your current and new password": "আপনার বর্তমান ও নতুন পাসওয়ার্ড লিখুন",
  "New password and confirmation don't match": "নতুন পাসওয়ার্ড ও নিশ্চিতকরণ মিলছে না",
  "Password updated": "পাসওয়ার্ড আপডেট হয়েছে",
  "Failed to update password": "পাসওয়ার্ড আপডেট করতে ব্যর্থ হয়েছে",
  "Profile Information": "প্রোফাইল তথ্য",
  "Update your personal information": "আপনার ব্যক্তিগত তথ্য আপডেট করুন",
  "Change Avatar": "অ্যাভাটার পরিবর্তন করুন",
  "First Name": "প্রথম নাম",
  "Last Name": "শেষ নাম",
  "Contact support to change your email": "আপনার ইমেইল পরিবর্তন করতে সহায়তা কেন্দ্রে যোগাযোগ করুন",
  "Phone Number": "ফোন নম্বর",
  "Update your password": "আপনার পাসওয়ার্ড আপডেট করুন",
  "Current Password": "বর্তমান পাসওয়ার্ড",
  "New Password": "নতুন পাসওয়ার্ড",
  "Confirm New Password": "নতুন পাসওয়ার্ড নিশ্চিত করুন",
  "Update Password": "পাসওয়ার্ড আপডেট করুন",

  // src/components/settings/ChangeAvatarModal.tsx
  "Only JPG, PNG, WEBP, or GIF images are allowed": "শুধুমাত্র JPG, PNG, WEBP, বা GIF ছবি অনুমোদিত",
  "Image must be 5MB or smaller": "ছবিটি অবশ্যই 5MB বা তার কম হতে হবে",
  "Avatar updated": "অ্যাভাটার আপডেট হয়েছে",
  "Failed to upload avatar": "অ্যাভাটার আপলোড করতে ব্যর্থ হয়েছে",
  "Change Profile Picture": "প্রোফাইল ছবি পরিবর্তন করুন",
  "Upload a new profile picture. Recommended size: 400x400px": "একটি নতুন প্রোফাইল ছবি আপলোড করুন। প্রস্তাবিত আকার: 400x400px",
  "Choose Image": "ছবি নির্বাচন করুন",
  "JPG, PNG or GIF (max 5MB)": "JPG, PNG বা GIF (সর্বোচ্চ 5MB)",
  "Upload Avatar": "অ্যাভাটার আপলোড করুন",

  // src/components/settings/SecurityTab.tsx
  "Sign out": "সাইন আউট",
  "That device will need to log in again.": "সেই ডিভাইসটিকে আবার লগইন করতে হবে।",
  "Device signed out": "ডিভাইস সাইন আউট হয়েছে",
  "Failed to sign out that device": "সেই ডিভাইসটি সাইন আউট করতে ব্যর্থ হয়েছে",
  "Two-Factor Authentication": "দ্বি-স্তর যাচাইকরণ",
  "Add an extra layer of security to your account": "আপনার অ্যাকাউন্টে অতিরিক্ত নিরাপত্তা স্তর যোগ করুন",
  "Enable 2FA": "2FA চালু করুন",
  "Send a code to your phone or email when logging in.": "লগইন করার সময় আপনার ফোন বা ইমেইলে একটি কোড পাঠান।",
  "Coming soon -- no SMS/email provider is configured yet": "শীঘ্রই আসছে -- এখনো কোনো SMS/ইমেইল প্রোভাইডার কনফিগার করা হয়নি",
  "Device Management": "ডিভাইস ব্যবস্থাপনা",
  "See where you're signed in": "আপনি কোথায় সাইন ইন আছেন তা দেখুন",
  Devices: "ডিভাইস",
  History: "ইতিহাস",
  "No active sessions found.": "কোনো সক্রিয় সেশন পাওয়া যায়নি।",
  Current: "বর্তমান",
  "Active now": "এখন সক্রিয়",
  "Last active": "সর্বশেষ সক্রিয়",
  "Signing out...": "সাইন আউট হচ্ছে...",
  "No login history yet.": "এখনো কোনো লগইন ইতিহাস নেই।",
  "Additional Security": "অতিরিক্ত নিরাপত্তা",
  "Configure extra protections": "অতিরিক্ত সুরক্ষা কনফিগার করুন",
  "Login Alerts": "লগইন সতর্কতা",
  "Receive email notifications of new logins": "নতুন লগইনের জন্য ইমেইল নোটিফিকেশন পান",
  "Suspicious Activity": "সন্দেহজনক কার্যকলাপ",
  "Alert on unusual login attempts": "অস্বাভাবিক লগইন প্রচেষ্টায় সতর্ক করুন",
  "Reset Protection": "রিসেট সুরক্ষা",
  "Require verification to reset password": "পাসওয়ার্ড রিসেট করতে যাচাইকরণ প্রয়োজন",
  "Coming soon -- no email provider is configured yet": "শীঘ্রই আসছে -- এখনো কোনো ইমেইল প্রোভাইডার কনফিগার করা হয়নি",

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
  "Enter PIN": "পিন লিখুন",
  "Enter PIN:": "পিন লিখুন:",
  Unlock: "আনলক",

  // src/components/workspace/WorkspaceSettingsPage.tsx
  "This cannot be undone.": "এটি পূর্বাবস্থায় ফেরানো যাবে না।",
  "Workspace deleted": "ওয়ার্কস্পেস মুছে ফেলা হয়েছে",
  "Failed to delete workspace": "ওয়ার্কস্পেস মুছতে ব্যর্থ হয়েছে",
  Workspaces: "ওয়ার্কস্পেসসমূহ",
  "Manage your Personal and Business workspaces.": "আপনার ব্যক্তিগত ও ব্যবসায়িক ওয়ার্কস্পেসসমূহ পরিচালনা করুন।",
  Default: "ডিফল্ট",
  Trial: "ট্রায়াল",
  "Trial expired": "ট্রায়াল মেয়াদ শেষ",
  "Monthly fee:": "মাসিক ফি:",
  "(50% of your plan)": "(আপনার প্ল্যানের ৫০%)",
  "Your default Personal workspace can't be deleted -- every account must always have one.":
    "আপনার ডিফল্ট ব্যক্তিগত ওয়ার্কস্পেস মুছে ফেলা যাবে না -- প্রতিটি অ্যাকাউন্টে সবসময় একটি থাকতে হবে।",

  // src/components/workspace/WorkspaceSwitcher.tsx
  "Select workspace": "ওয়ার্কস্পেস নির্বাচন করুন",
  Personal: "ব্যক্তিগত",
  "Business Workspaces": "ব্যবসায়িক ওয়ার্কস্পেসসমূহ",
  "New workspace": "নতুন ওয়ার্কস্পেস",

  // src/components/workspace/ChooseWorkspaceClient.tsx
  day: "দিন",
  days: "দিন",
  left: "বাকি",
  "Choose your Workspace": "আপনার ওয়ার্কস্পেস নির্বাচন করুন",
  "Select which workspace to open, or add a new one": "কোন ওয়ার্কস্পেসটি খুলবেন তা নির্বাচন করুন, অথবা একটি নতুন যোগ করুন",
  "Business Workspace": "ব্যবসায়িক ওয়ার্কস্পেস",
  "Personal Workspace": "ব্যক্তিগত ওয়ার্কস্পেস",
  Select: "নির্বাচন করুন",
  "Add New Workspace": "নতুন ওয়ার্কস্পেস যোগ করুন",
};
