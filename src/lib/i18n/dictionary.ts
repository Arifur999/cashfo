// English is the source language everywhere else in the app (the existing
// t() in ./t.ts is an identity passthrough) -- this dictionary only needs to
// carry the Bangla side. Keys are the exact English strings used as lookup
// keys by useLocale()'s translate(), so no call site elsewhere needs to
// change.
//
// Scope note: only the persistent chrome (sidebar nav, top bar, the toggle
// itself) is wired up to actually re-render on locale change, since those
// are the only pieces rendered by Client Components. Page titles and
// per-feature buttons (Save/Cancel/Edit/Delete, etc.) live in Server
// Component pages throughout the other ~9 modules and stay English for now
// -- making those reactive would need a cookie-based locale read server-side
// rather than this client-only Context, which is future work.
export const bnDictionary: Record<string, string> = {
  "Admin Panel": "অ্যাডমিন প্যানেল",
  Dashboard: "ড্যাশবোর্ড",
  "User Management": "ইউজার ম্যানেজমেন্ট",
  Subscriptions: "সাবস্ক্রিপশন",
  Payments: "পেমেন্ট",
  Content: "কন্টেন্ট",
  Support: "সাপোর্ট",
  Analytics: "অ্যানালিটিক্স",
  Security: "সিকিউরিটি",
  System: "সিস্টেম",
  Notifications: "নোটিফিকেশন",
  Settings: "সেটিংস",
  "Coming soon": "শীঘ্রই আসছে",
  "Welcome back,": "স্বাগতম,",
  "Log out": "লগ আউট",
  Save: "সংরক্ষণ",
  Cancel: "বাতিল",
  Edit: "সম্পাদনা",
  Delete: "মুছুন",
};
