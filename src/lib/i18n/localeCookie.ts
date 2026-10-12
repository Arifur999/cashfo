// The language choice lives in a cookie, not just React state, so Server
// Components can render in it too (locale.ts reads it; LocaleProvider.tsx
// writes it). Kept apart from locale.ts, which imports next/headers and so
// can't be imported by a Client Component.
export const LOCALE_COOKIE = "locale";
export const LOCALE_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;
