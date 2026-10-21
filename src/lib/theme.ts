import { FORGOT_PASSWORD_ROUTE, LEGAL_ROUTES, LOGIN_ROUTE, MAINTENANCE_ROUTE, REGISTER_ROUTE, RESET_PASSWORD_ROUTE } from "./authUtils";

// Dark mode is the customer app's: the admin panel and the sign-in pages
// stay light. The choice lives in localStorage; until one is made, the OS
// setting decides.
export const THEME_STORAGE_KEY = "theme";

// The dark_mode feature flag (Admin > System > Feature Flags) as the
// customer app last saw it. ThemeProvider saves it because the script below
// runs before React and can't see the flag itself.
export const THEME_ALLOWED_KEY = "theme-allowed";

// What ThemeProvider saves under THEME_ALLOWED_KEY, and what the script
// below reads back.
export const themeAllowedValue = (allowDark: boolean): string => (allowDark ? "1" : "0");

// Paths that never go dark, as one regex for the inline script below.
const LIGHT_ONLY_PREFIXES = ["/admin", LOGIN_ROUTE, REGISTER_ROUTE, FORGOT_PASSWORD_ROUTE, RESET_PASSWORD_ROUTE, MAINTENANCE_ROUTE, ...LEGAL_ROUTES];
const LIGHT_ONLY_PATTERN = `^(${LIGHT_ONLY_PREFIXES.join("|")})(/|$)`;

// Runs in <head> before the page paints (root layout), so a dark-mode
// customer never sees a flash of white. ThemeProvider takes over after
// hydration, including on client-side navigations, which don't re-run it.
// While the flag is saved as off the page stays light, so a switched-off
// dark mode doesn't flash in before ThemeProvider takes it off, nor stay on
// a page that has no ThemeProvider. Storage that can't be read (none at all
// in an Android WebView by default, blocked in some private windows) leaves
// the page light too, since the flag is unknown: when dark is allowed,
// ThemeProvider applies the OS setting after hydration. A saved value other
// than light or dark counts as no choice, as it does there.
export const THEME_INIT_SCRIPT = `(function(){try{if(new RegExp(${JSON.stringify(LIGHT_ONLY_PATTERN)}).test(location.pathname))return;var a,t;try{a=localStorage.getItem(${JSON.stringify(THEME_ALLOWED_KEY)});t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});}catch(e){return;}if(a===${JSON.stringify(themeAllowedValue(false))})return;var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;
