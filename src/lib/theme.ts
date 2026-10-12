import { FORGOT_PASSWORD_ROUTE, LOGIN_ROUTE, REGISTER_ROUTE, RESET_PASSWORD_ROUTE } from "./authUtils";

// Dark mode is the customer app's: the admin panel and the sign-in pages
// stay light. The choice lives in localStorage; until one is made, the OS
// setting decides.
export const THEME_STORAGE_KEY = "theme";

// Paths that never go dark, as one regex for the inline script below.
const LIGHT_ONLY_PREFIXES = ["/admin", LOGIN_ROUTE, REGISTER_ROUTE, FORGOT_PASSWORD_ROUTE, RESET_PASSWORD_ROUTE];
const LIGHT_ONLY_PATTERN = `^(${LIGHT_ONLY_PREFIXES.join("|")})(/|$)`;

// Runs in <head> before the page paints (root layout), so a dark-mode
// customer never sees a flash of white. ThemeProvider takes over after
// hydration, including on client-side navigations, which don't re-run it.
export const THEME_INIT_SCRIPT = `(function(){try{if(new RegExp(${JSON.stringify(LIGHT_ONLY_PATTERN)}).test(location.pathname))return;var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;
