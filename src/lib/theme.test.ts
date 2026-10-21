import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { THEME_ALLOWED_KEY, THEME_INIT_SCRIPT, THEME_STORAGE_KEY, themeAllowedValue } from "./theme";

interface Page {
  path?: string;
  // What localStorage holds; "blocked" when reading it throws (some private
  // windows), "none" when there is no localStorage at all (an Android
  // WebView with DOM storage off, its default).
  storage?: Record<string, string> | "blocked" | "none";
  prefersDark?: boolean;
  // false: a browser without matchMedia.
  hasMatchMedia?: boolean;
}

// Runs the inline script as the browser does before React, against a fake
// page, and says whether <html> ended up with the dark class.
function startsDark({ path = "/dashboard", storage = {}, prefersDark = false, hasMatchMedia = true }: Page = {}): boolean {
  const classes = new Set<string>();
  runInNewContext(THEME_INIT_SCRIPT, {
    location: { pathname: path },
    localStorage:
      storage === "none"
        ? null
        : {
            getItem(key: string): string | null {
              if (storage === "blocked") throw new Error("SecurityError: storage is blocked");
              return storage[key] ?? null;
            },
          },
    window: hasMatchMedia ? { matchMedia: (query: string) => ({ matches: prefersDark && query === "(prefers-color-scheme: dark)" }) } : {},
    document: {
      documentElement: {
        classList: {
          toggle(name: string, force: boolean) {
            if (force) classes.add(name);
            else classes.delete(name);
            return force;
          },
        },
      },
    },
  });
  return classes.has("dark");
}

const chose = (theme: string) => ({ [THEME_STORAGE_KEY]: theme });
const flagOff = { [THEME_ALLOWED_KEY]: themeAllowedValue(false) };
const flagOn = { [THEME_ALLOWED_KEY]: themeAllowedValue(true) };

describe("themeAllowedValue", () => {
  it("saves the dark_mode flag as 1 or 0", () => {
    expect(themeAllowedValue(true)).toBe("1");
    expect(themeAllowedValue(false)).toBe("0");
  });
});

describe("THEME_INIT_SCRIPT", () => {
  it("starts in the theme that was chosen", () => {
    expect(startsDark({ storage: chose("dark") })).toBe(true);
    expect(startsDark({ storage: chose("light"), prefersDark: true })).toBe(false);
  });

  it("follows the device until a choice is saved", () => {
    expect(startsDark({ prefersDark: true })).toBe(true);
    expect(startsDark({ prefersDark: false })).toBe(false);
    // A value ThemeProvider never writes counts as no choice, as it does there.
    expect(startsDark({ storage: chose("sepia"), prefersDark: true })).toBe(true);
  });

  it("stays light while the dark_mode flag is saved as off", () => {
    // Including the workspace pages outside the app's shell.
    for (const path of ["/dashboard", "/settings/app", "/choose-workspace", "/unlock-workspace"]) {
      expect(startsDark({ path, storage: { ...flagOff, ...chose("dark") } }), path).toBe(false);
      expect(startsDark({ path, storage: flagOff, prefersDark: true }), path).toBe(false);
    }
  });

  it("goes dark when the flag is saved as on, or hasn't been saved yet", () => {
    expect(startsDark({ storage: { ...flagOn, ...chose("dark") } })).toBe(true);
    expect(startsDark({ storage: flagOn, prefersDark: true })).toBe(true);
    // A first visit: the flag is on unless an admin turned it off.
    expect(startsDark({ storage: chose("dark") })).toBe(true);
  });

  it("keeps the admin panel, the sign-in pages and the legal pages light", () => {
    for (const path of ["/admin", "/admin/users", "/login", "/login/google", "/register", "/forgot-password", "/reset-password", "/maintenance", "/terms", "/privacy", "/refund-policy", "/faq"]) {
      expect(startsDark({ path, storage: { ...flagOn, ...chose("dark") }, prefersDark: true }), path).toBe(false);
    }
    // Whole path segments only.
    expect(startsDark({ path: "/administrator", storage: chose("dark") })).toBe(true);
  });

  it("stays light when storage can't be read", () => {
    // The flag is unknown, so a switched-off dark mode must not flash in;
    // ThemeProvider applies the device's setting after hydration when dark
    // is allowed.
    for (const storage of ["blocked", "none"] as const) {
      for (const path of ["/dashboard", "/choose-workspace", "/unlock-workspace"]) {
        expect(startsDark({ path, storage, prefersDark: true }), `${storage} ${path}`).toBe(false);
        expect(startsDark({ path, storage, prefersDark: false }), `${storage} ${path}`).toBe(false);
      }
    }
  });

  it("never throws, even without matchMedia", () => {
    expect(() => startsDark({ hasMatchMedia: false })).not.toThrow();
    expect(startsDark({ hasMatchMedia: false })).toBe(false);
    expect(startsDark({ hasMatchMedia: false, storage: chose("dark") })).toBe(true);
  });
});
