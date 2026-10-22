// Bangla for the sign-in, sign-up and password-reset pages, keyed by the
// exact English the components pass to translate() -- including the zod and
// backend messages they show, so errors read in Bangla too.
export const bnAuthDictionary: Record<string, string> = {
  // Brand panel
  "Money management for people and businesses": "ব্যক্তি ও ব্যবসার জন্য টাকা-পয়সার হিসাব",
  "Every account, every taka, in one place.": "সব অ্যাকাউন্ট, প্রতিটি টাকা, এক জায়গায়।",
  "Track income and expenses across every account": "সব অ্যাকাউন্টের আয়-ব্যয় এক জায়গায়",
  "Plan budgets and savings goals": "বাজেট ও সঞ্চয়ের লক্ষ্য পরিকল্পনা",
  "Bangla and English, on any device": "বাংলা ও ইংরেজি, যেকোনো ডিভাইসে",
  "Secure sign-in with Google or a password": "Google বা পাসওয়ার্ড দিয়ে নিরাপদ সাইন-ইন",

  // Headings
  "Welcome back": "আবার স্বাগতম",
  "Sign in to your account": "আপনার অ্যাকাউন্টে সাইন ইন করুন",
  "Create your account": "আপনার অ্যাকাউন্ট তৈরি করুন",
  "Start managing your money in minutes": "মিনিটেই আপনার টাকা-পয়সার হিসাব শুরু করুন",
  "Forgot your password?": "পাসওয়ার্ড ভুলে গেছেন?",
  "Enter your email and we'll send you a link to reset it.": "আপনার ইমেইল দিন, আমরা পাসওয়ার্ড রিসেট করার একটি লিংক পাঠাবো।",
  "Check your email": "আপনার ইমেইল দেখুন",
  "If an account uses this email, a reset link is on its way:": "এই ইমেইলে অ্যাকাউন্ট থাকলে একটি রিসেট লিংক পাঠানো হয়েছে:",
  "The link works for 30 minutes. Check your spam folder if it doesn't arrive.":
    "লিংকটি ৩০ মিনিট কাজ করবে। না পেলে স্প্যাম ফোল্ডার দেখুন।",
  "Admin passwords are reset by a super admin.": "অ্যাডমিনদের পাসওয়ার্ড সুপার অ্যাডমিন রিসেট করেন।",
  "Choose a new password": "নতুন পাসওয়ার্ড দিন",
  "You'll use it from now on. Every other device will be signed out.": "এখন থেকে এটিই ব্যবহার করবেন। অন্য সব ডিভাইস থেকে সাইন আউট হয়ে যাবে।",
  "This reset link is incomplete": "এই রিসেট লিংকটি অসম্পূর্ণ",
  "Open the link from the email again, or request a new one.": "ইমেইলের লিংকটি আবার খুলুন, অথবা নতুন লিংক চান।",

  // Fields
  Email: "ইমেইল",
  Password: "পাসওয়ার্ড",
  "Full name": "পূর্ণ নাম",
  "Your name": "আপনার নাম",
  "Phone (optional)": "ফোন (ঐচ্ছিক)",
  "Confirm password": "পাসওয়ার্ড নিশ্চিত করুন",
  "New password": "নতুন পাসওয়ার্ড",
  "At least 8 characters, with a letter and a number": "কমপক্ষে ৮ অক্ষর, একটি অক্ষর ও একটি সংখ্যা সহ",
  "Show password": "পাসওয়ার্ড দেখান",
  "Hide password": "পাসওয়ার্ড লুকান",
  "Password strength": "পাসওয়ার্ডের শক্তি",
  "Too weak": "খুব দুর্বল",
  Fair: "মোটামুটি",
  Good: "ভালো",
  Strong: "শক্তিশালী",

  // Actions and links
  "Sign in": "সাইন ইন",
  "Signing in...": "সাইন ইন হচ্ছে...",
  "Create account": "অ্যাকাউন্ট তৈরি করুন",
  "Creating account...": "অ্যাকাউন্ট তৈরি হচ্ছে...",
  "Forgot password?": "পাসওয়ার্ড ভুলে গেছেন?",
  "Send reset link": "রিসেট লিংক পাঠান",
  "Sending...": "পাঠানো হচ্ছে...",
  "Save new password": "নতুন পাসওয়ার্ড সংরক্ষণ করুন",
  "Saving...": "সংরক্ষণ হচ্ছে...",
  "Back to sign in": "সাইন ইনে ফিরে যান",
  "Use a different email": "অন্য ইমেইল ব্যবহার করুন",
  "Request a new link": "নতুন লিংক চান",
  "Don't have an account?": "অ্যাকাউন্ট নেই?",
  "Create one": "একটি তৈরি করুন",
  "Already have an account?": "আগে থেকেই অ্যাকাউন্ট আছে?",
  "Remembered it?": "মনে পড়েছে?",
  "Continue with Google": "Google দিয়ে চালিয়ে যান",
  "Opening Google...": "Google খোলা হচ্ছে...",
  or: "অথবা",

  // Notices and errors
  "Your session has expired. Please sign in again.": "আপনার সেশনের মেয়াদ শেষ। আবার সাইন ইন করুন।",
  "Google sign-in isn't available right now. Use your email and password.":
    "এই মুহূর্তে Google সাইন-ইন কাজ করছে না। ইমেইল ও পাসওয়ার্ড ব্যবহার করুন।",
  "This account has been suspended. Contact support for help.": "এই অ্যাকাউন্টটি স্থগিত করা হয়েছে। সাহায্যের জন্য সাপোর্টে যোগাযোগ করুন।",
  "This email already has an account. Sign in with your password.": "এই ইমেইলে আগে থেকেই অ্যাকাউন্ট আছে। পাসওয়ার্ড দিয়ে সাইন ইন করুন।",
  "Google sign-in was cancelled.": "Google সাইন-ইন বাতিল করা হয়েছে।",
  "Google didn't share an email address with us.": "Google আমাদের সাথে কোনো ইমেইল ঠিকানা শেয়ার করেনি।",
  "No account uses that Google address yet.": "এই Google ঠিকানায় এখনো কোনো অ্যাকাউন্ট নেই।",
  "Google sign-in didn't finish. Please try again.": "Google সাইন-ইন শেষ হয়নি। আবার চেষ্টা করুন।",
  "Enter a valid email address": "সঠিক ইমেইল ঠিকানা দিন",
  "Enter your password": "আপনার পাসওয়ার্ড দিন",
  "Enter your name": "আপনার নাম দিন",
  "At most 80 characters": "সর্বোচ্চ ৮০ অক্ষর",
  "Enter a valid phone number": "সঠিক ফোন নম্বর দিন",
  "Use at least 8 characters": "কমপক্ষে ৮ অক্ষর ব্যবহার করুন",
  "Use at least one letter and one number": "অন্তত একটি অক্ষর ও একটি সংখ্যা ব্যবহার করুন",
  "Type the password again": "পাসওয়ার্ডটি আবার লিখুন",
  "The passwords don't match": "পাসওয়ার্ড দুটি মিলছে না",
  "Invalid email or password": "ইমেইল বা পাসওয়ার্ড ভুল",
  "An account with this email already exists": "এই ইমেইলে আগে থেকেই একটি অ্যাকাউন্ট আছে",
  "Your account has been suspended. Contact support for assistance.": "আপনার অ্যাকাউন্ট স্থগিত করা হয়েছে। সহায়তার জন্য সাপোর্টে যোগাযোগ করুন।",
  "This reset link is invalid or has expired. Please request a new one.": "এই রিসেট লিংকটি অবৈধ বা মেয়াদোত্তীর্ণ। নতুন লিংক চান।",
  "Too many attempts. Please wait a few minutes and try again.": "অনেকবার চেষ্টা করা হয়েছে। কয়েক মিনিট পরে আবার চেষ্টা করুন।",
  "Unable to reach the server. Please try again.": "সার্ভারে পৌঁছানো যাচ্ছে না। আবার চেষ্টা করুন।",
  "Check the form and try again": "ফর্মটি দেখে আবার চেষ্টা করুন",
  "We couldn't create your account. Please try again.": "অ্যাকাউন্ট তৈরি করা যায়নি। আবার চেষ্টা করুন।",
  "We couldn't send the link. Please try again.": "লিংক পাঠানো যায়নি। আবার চেষ্টা করুন।",
  "We couldn't save your new password. Please try again.": "নতুন পাসওয়ার্ড সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।",
  "This reset link is incomplete. Request a new one.": "এই রিসেট লিংকটি অসম্পূর্ণ। নতুন লিংক চান।",
  // zod's register and password rules (zod/auth.validation.ts), and what the
  // API answers when one slips past them.
  "Leave web addresses out of your name": "নামে কোনো ওয়েব ঠিকানা দেবেন না",
  "At most 128 characters": "সর্বোচ্চ ১২৮ অক্ষর",
  "At most 64 characters": "সর্বোচ্চ ৬৪ অক্ষর",
  "Name cannot contain a web address": "নামে ওয়েব ঠিকানা রাখা যাবে না",
  "Password must contain at least one letter and one number": "পাসওয়ার্ডে অন্তত একটি অক্ষর ও একটি সংখ্যা থাকতে হবে",
  // A suspended admin's sign-in refusal (admin-auth.service.ts).
  "This account has been suspended": "এই অ্যাকাউন্টটি স্থগিত করা হয়েছে",
  // The sign-in pages' call to their action never got an answer
  // (useAuthAction.ts): an older tab after a deploy needs a reload.
  "{brand} was just updated. Reload the page and try again.": "{brand} এইমাত্র আপডেট হয়েছে। পেজটি রিলোড করে আবার চেষ্টা করুন।",
  "Reload the page": "পেজটি রিলোড করুন",
  // lib/actionError.ts once it reads the throttler's Retry-After (requested):
  // the login lock lasts up to 15 minutes, not "a few".
  "Too many attempts. Try again in {minutes} minutes.": "অনেকবার চেষ্টা করা হয়েছে। {minutes} মিনিট পরে আবার চেষ্টা করুন।",
  "Too many attempts. Try again in a minute.": "অনেকবার চেষ্টা করা হয়েছে। এক মিনিট পরে আবার চেষ্টা করুন।",
  "Too many attempts. Wait up to 15 minutes, then try again.": "অনেকবার চেষ্টা করা হয়েছে। ১৫ মিনিট পর্যন্ত অপেক্ষা করে আবার চেষ্টা করুন।",
  // Next steps under an error.
  "Sign in instead": "বরং সাইন ইন করুন",
  "Reset your password": "পাসওয়ার্ড রিসেট করুন",
  "Created your account with Google? Use Continue with Google.": "Google দিয়ে অ্যাকাউন্ট খুলেছিলেন? \"Google দিয়ে চালিয়ে যান\" ব্যবহার করুন।",

  // components/modules/Legal/* and the maintenance page and notice -- the
  // pages anyone can open. The pages' own names (Terms of use, Privacy
  // policy ...) are worded in settings-workspace.ts.
  Legal: "আইনি তথ্য",
  // A saved version is live at once, so it is in effect from when it was saved.
  "Version {version} · in effect from {date}": "সংস্করণ {version} · {date} থেকে কার্যকর",
  "This page is only in English for now.": "এই পৃষ্ঠাটি আপাতত শুধু ইংরেজিতে আছে।",
  "This page isn't available right now. Please check back later.": "পৃষ্ঠাটি এখন পাওয়া যাচ্ছে না। একটু পরে আবার দেখুন।",
  "On this page": "এই পৃষ্ঠায়",
  "By creating an account, you agree to our {terms} and {privacy}.": "অ্যাকাউন্ট খুললে আপনি আমাদের {terms} ও {privacy} মেনে নিচ্ছেন।",
  // A screen reader's note on a link that opens in a new tab.
  "(opens in a new tab)": "(নতুন ট্যাবে খোলে)",
  "Under maintenance": "রক্ষণাবেক্ষণ চলছে",
  // What maintenance means for the sign-in page the notice is on.
  "You can sign in; the app opens again when we're done.": "সাইন ইন করতে পারবেন; কাজ শেষ হলে অ্যাপ আবার খুলবে।",
  "Sign-up is paused until then.": "ততক্ষণ নতুন অ্যাকাউন্ট খোলা বন্ধ থাকবে।",
  "Password reset is paused until then; ask for a new link afterwards.": "ততক্ষণ পাসওয়ার্ড রিসেট বন্ধ থাকবে; শেষ হলে নতুন লিংক চেয়ে নিন।",
  "We'll be back soon": "আমরা শীঘ্রই ফিরছি",
  "Questions? Write to": "কোনো প্রশ্ন? লিখুন",
  "Check again": "আবার দেখুন",
  "Checking again...": "আবার দেখা হচ্ছে...",
  "Still under maintenance. Checked at {time}.": "এখনো রক্ষণাবেক্ষণ চলছে। {time}-এ দেখা হয়েছে।",
  "{brand} is getting an upgrade": "{brand} আপগ্রেড হচ্ছে",

  // The message pages (app/error.tsx and the customer one): a browser-side
  // error has no reference to send.
  "Try again in a moment; if it keeps happening, tell us what you were doing.": "একটু পরে আবার চেষ্টা করুন; বারবার হলে আপনি কী করছিলেন তা আমাদের জানান।",
  // The root page is the admin panel's outage page too: nothing customer-only.
  "Anything already saved stays saved.": "যা সংরক্ষিত হয়েছে, তা সংরক্ষিতই থাকবে।",
  "Contact support": "সাপোর্টে যোগাযোগ করুন",

  // The Smartly sign-in pages (AuthHero, the forms)
  "About Smartly": "Smartly সম্পর্কে",
  "Your money, habits and passwords. Smartly sorted.": "আপনার টাকা, অভ্যাস আর পাসওয়ার্ড। Smartly-তে গোছানো।",
  "Income, loans, savings, prayers and every login, in one calm place that tells you what matters.":
    "আয়, দেনা-পাওনা, সঞ্চয়, নামাজ আর প্রতিটি লগইন -- এক শান্ত জায়গায়, যা জরুরি তা জানিয়ে দেয়।",
  "Grow smarter, every day.": "প্রতিদিন আরও স্মার্ট হোন।",
  "Set up your wallets, add your first transaction and see where every taka goes. Habits and passwords come along too.":
    "ওয়ালেট সাজান, প্রথম লেনদেন যোগ করুন আর দেখুন প্রতিটি টাকা কোথায় যায়। অভ্যাস আর পাসওয়ার্ডও সাথে থাকে।",
  "Money that adds up": "হিসাব মেলে এমন টাকা",
  "Income, budgets that warn you early, savings goals and assets.": "আয়, আগেভাগে সতর্ক করা বাজেট, সঞ্চয়ের লক্ষ্য আর সম্পদ।",
  "Dena-pawna, settled": "দেনা-পাওনা, মিটমাট",
  "Know exactly who owes you, and whom you owe.": "কে আপনার কাছে পায়, আপনি কার কাছে দেন -- ঠিকঠাক জানুন।",
  "Habits that stick": "টিকে থাকা অভ্যাস",
  "Prayers, reading and daily goals, tracked in a tap.": "নামাজ, পড়া আর দৈনিক লক্ষ্য, এক ট্যাপে ট্র্যাক।",
  "Free to start. Upgrade when you need more.": "শুরু করা ফ্রি। দরকার হলে আপগ্রেড করুন।",
  "Money, loans and savings in one place": "টাকা, দেনা-পাওনা আর সঞ্চয় এক জায়গায়",
  "A separate password for your vault": "ভল্টের জন্য আলাদা পাসওয়ার্ড",
  "English and বাংলা, light and dark": "ইংরেজি ও বাংলা, লাইট ও ডার্ক",
  // {bangla} is the word বাংলা itself, set in its own face.
  "English and {bangla}": "ইংরেজি ও {bangla}",
  "Light and dark": "লাইট ও ডার্ক",
  "Made for Bangladesh": "বাংলাদেশের জন্য তৈরি",
  "Money, loans, prayers and every login in one calm place.": "টাকা, দেনা-পাওনা, নামাজ আর প্রতিটি লগইন এক শান্ত জায়গায়।",
  "Total balance": "মোট ব্যালেন্স",
  "Money in": "টাকা এসেছে",
  "Money out": "টাকা গেছে",
  "Next prayer": "পরের নামাজ",
  "Asr · 4:05 pm": "আসর · বিকাল ৪:০৫",
  "Salary is 80% of your income.": "বেতন আপনার আয়ের ৮০%।",
  // Money keeps Latin digits in Bangla too, as on the cards beside it.
  "Freelance grew from ৳ 8,000 to ৳ 12,000 a month.": "ফ্রিল্যান্স মাসে ৳ 8,000 থেকে ৳ 12,000 হয়েছে।",
  "14 logins, locked": "১৪টি লগইন, লক করা",
  "Sign in to Smartly to pick up where you left off.": "যেখানে ছেড়েছিলেন সেখান থেকে শুরু করতে Smartly-তে সাইন ইন করুন।",
  "You've been signed out": "আপনাকে সাইন আউট করা হয়েছে",
  // Only when there is a ?redirect= page to go back to.
  "Sign in again and we will take you back to the page you were on.": "আবার সাইন ইন করুন, আমরা আপনাকে আগের পেজে ফিরিয়ে নেব।",
  "Sign in again to carry on.": "চালিয়ে যেতে আবার সাইন ইন করুন।",
  // Names Settings › Security's button as it reads (settings.ts).
  "For your safety we sign you out after a long time away, after a password change, or when Sign out everywhere else is used on another device.":
    "নিরাপত্তার জন্য অনেকক্ষণ দূরে থাকলে, পাসওয়ার্ড বদলালে, অথবা অন্য ডিভাইসে \"বাকি সব জায়গা থেকে সাইন আউট\" ব্যবহার করা হলে আমরা আপনাকে সাইন আউট করি।",
  "Money Tracker is now {brand}. Same account, same data, a few new things inside.": "Money Tracker এখন {brand}। একই অ্যাকাউন্ট, একই তথ্য, ভেতরে কিছু নতুন জিনিস।",
  "Your password": "আপনার পাসওয়ার্ড",
  "New to Smartly?": "Smartly-তে নতুন?",
  "Create an account": "অ্যাকাউন্ট খুলুন",
  "One account for your money, habits and passwords.": "আপনার টাকা, অভ্যাস আর পাসওয়ার্ডের জন্য একটি অ্যাকাউন্ট।",
  Phone: "ফোন",
  optional: "ঐচ্ছিক",
  // The new-password meter's label, a whole phrase per step.
  "Password too weak": "পাসওয়ার্ড খুব দুর্বল",
  "Fair password": "মোটামুটি পাসওয়ার্ড",
  "Good password": "ভালো পাসওয়ার্ড",
  "Strong password": "শক্তিশালী পাসওয়ার্ড",
  // What a screen reader hears as the meter changes, and before each rule.
  "Password strength: {strength}": "পাসওয়ার্ডের শক্তি: {strength}",
  "Done:": "হয়েছে:",
  "Not yet:": "এখনো হয়নি:",
  "At least 8 characters": "কমপক্ষে ৮ অক্ষর",
  "A letter and a number": "একটি অক্ষর ও একটি সংখ্যা",
  "Passwords match": "পাসওয়ার্ড মিলেছে",
  "Sign up with Google": "Google দিয়ে সাইন আপ",
  "It happens. Enter the email you sign in with and we'll send you a link to choose a new one.":
    "হতেই পারে। যে ইমেইল দিয়ে সাইন ইন করেন সেটি দিন, নতুন পাসওয়ার্ড বেছে নেওয়ার লিংক পাঠাব।",
  "We'll send a link to this address if it has a Smartly account.": "এই ঠিকানায় Smartly অ্যাকাউন্ট থাকলে লিংক পাঠাব।",
  "The link works for 30 minutes and only once. Check spam if it hasn't arrived in 2 minutes.":
    "লিংকটি ৩০ মিনিট ও একবারই কাজ করে। ২ মিনিটে না এলে স্প্যাম দেখুন।",
  "Pick something you have not used on Smartly before.": "এমন কিছু বেছে নিন যা আগে Smartly-তে ব্যবহার করেননি।",
  "Your vault password does not change.": "আপনার ভল্টের পাসওয়ার্ড বদলাবে না।",
  "Type it again": "আবার লিখুন",
  "You'll be signed out on every other device.": "অন্য সব ডিভাইস থেকে সাইন আউট হয়ে যাবেন।",
  "Habits and prayers": "অভ্যাস ও নামাজ",
  "Namaz, Ramadan, reading and your daily to-do list.": "নামাজ, রমজান, পড়া আর প্রতিদিনের কাজের তালিকা।",
  "A vault for every password": "প্রতিটি পাসওয়ার্ডের জন্য একটি ভল্ট",
  "Its own password, and it locks itself after a few minutes.": "আলাদা পাসওয়ার্ড, আর কয়েক মিনিট পর নিজেই লক হয়ে যায়।",
  "Sign in again": "আবার সাইন ইন করুন",
  "Keep me signed in on this device": "এই ডিভাইসে সাইন ইন থাকুন",

  // Sign-up's invite code: from a ?ref= link, or typed from a friend's text.
  "Have an invite code?": "ইনভাইট কোড আছে?",
  "Invite code": "ইনভাইট কোড",
  "Signing up with invite code {code}": "ইনভাইট কোড {code} দিয়ে সাইন আপ করছেন",

  // "Check your email", once the reset link is on its way.
  "Only the newest link works.": "শুধু সবচেয়ে নতুন লিংকটিই কাজ করবে।",
  "Send the link again": "লিংকটি আবার পাঠান",
  "Send again in {seconds}s": "{seconds} সেকেন্ড পর আবার পাঠান",
  "Sent again. Use the link in the newest email.": "আবার পাঠানো হয়েছে। সবচেয়ে নতুন ইমেইলের লিংকটি ব্যবহার করুন।",
  // A reset link the API says can't be used any more.
  "This reset link no longer works": "এই রিসেট লিংকটি আর কাজ করে না",
  "A link lasts 30 minutes, works once, and only the newest one works. Request a new link and open it from the latest email.":
    "একটি লিংক ৩০ মিনিট থাকে, একবারই কাজ করে, আর শুধু সবচেয়ে নতুনটিই চলে। নতুন লিংক চেয়ে সর্বশেষ ইমেইল থেকে খুলুন।",

  // The two lines on each sign-in page's photo.
  "Track. Save. Grow.": "হিসাব। সঞ্চয়। বৃদ্ধি।",
  "Welcome back to calm money.": "নিশ্চিন্ত হিসাবের জগতে আবার স্বাগতম।",
  "Plant your first seed.": "প্রথম বীজটি বুনুন।",
  "Every taka you track grows into a plan.": "যে টাকার হিসাব রাখেন, তা-ই একদিন পরিকল্পনা হয়ে বেড়ে ওঠে।",
  "Back in a moment.": "এক মুহূর্তেই ফিরছেন।",
  "We'll get you into your account safely.": "আমরা নিরাপদে আপনাকে অ্যাকাউন্টে ফিরিয়ে দেব।",
};
