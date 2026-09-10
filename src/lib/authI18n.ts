// Lightweight, auth-pages-only translation object -- NOT the site-wide i18n
// system (that's a later prompt, once the admin panel's LocaleProvider
// pattern gets ported over here). This exists solely so the very first
// touchpoint (register/login) can be used comfortably in Bangla before any
// account/preference exists to read a language from.
export type AuthLang = "EN" | "BN";

export const authDictionary = {
  EN: {
    loginTitle: "Welcome back",
    loginSubtitle: "Sign in to continue",
    registerTitle: "Create your account",
    registerSubtitle: "Start managing your money in minutes",
    name: "Name",
    email: "Email",
    phone: "Phone (optional)",
    password: "Password",
    confirmPassword: "Confirm Password",
    forgotPassword: "Forgot password?",
    signIn: "Sign In",
    signingIn: "Signing in...",
    createAccount: "Create Account",
    creatingAccount: "Creating account...",
    noAccount: "Don't have an account?",
    createOne: "Create one",
    haveAccount: "Already have an account?",
    signInInstead: "Sign in",
    namePlaceholder: "Your name",
    emailPlaceholder: "you@example.com",
    phonePlaceholder: "01XXXXXXXXX",
    passwordPlaceholder: "At least 8 characters",
    confirmPasswordPlaceholder: "********",
    passwordsDontMatch: "Passwords do not match",
    passwordTooShort: "Password must be at least 8 characters",
    passwordNeedsLetterNumber: "Password must contain at least one letter and one number",
    unreachable: "Unable to reach the server. Is the backend running?",
  },
  BN: {
    loginTitle: "স্বাগতম",
    loginSubtitle: "চালিয়ে যেতে সাইন ইন করুন",
    registerTitle: "আপনার অ্যাকাউন্ট তৈরি করুন",
    registerSubtitle: "মিনিটেই আপনার টাকা-পয়সার হিসাব শুরু করুন",
    name: "নাম",
    email: "ইমেইল",
    phone: "ফোন (ঐচ্ছিক)",
    password: "পাসওয়ার্ড",
    confirmPassword: "পাসওয়ার্ড নিশ্চিত করুন",
    forgotPassword: "পাসওয়ার্ড ভুলে গেছেন?",
    signIn: "সাইন ইন",
    signingIn: "সাইন ইন হচ্ছে...",
    createAccount: "অ্যাকাউন্ট তৈরি করুন",
    creatingAccount: "অ্যাকাউন্ট তৈরি হচ্ছে...",
    noAccount: "অ্যাকাউন্ট নেই?",
    createOne: "একটি তৈরি করুন",
    haveAccount: "আগে থেকেই অ্যাকাউন্ট আছে?",
    signInInstead: "সাইন ইন করুন",
    namePlaceholder: "আপনার নাম",
    emailPlaceholder: "you@example.com",
    phonePlaceholder: "01XXXXXXXXX",
    passwordPlaceholder: "কমপক্ষে ৮ অক্ষর",
    confirmPasswordPlaceholder: "********",
    passwordsDontMatch: "পাসওয়ার্ড মিলছে না",
    passwordTooShort: "পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে",
    passwordNeedsLetterNumber: "পাসওয়ার্ডে অন্তত একটি অক্ষর ও একটি সংখ্যা থাকতে হবে",
    unreachable: "সার্ভারে পৌঁছানো যাচ্ছে না। ব্যাকএন্ড চালু আছে তো?",
  },
} as const;

export type AuthDictionary = (typeof authDictionary)["EN"];
