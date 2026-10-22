// Whether the desktop sidebar is folded to its icons. A cookie, not local
// storage, so the server draws the sidebar at the right width from the
// first paint instead of jumping after hydration.
export const SIDEBAR_COLLAPSED_COOKIE = "sidebar_collapsed";

const ONE_YEAR = 60 * 60 * 24 * 365;

export const sidebarCookie = (collapsed: boolean) => `${SIDEBAR_COLLAPSED_COOKIE}=${collapsed ? "1" : "0"}; path=/; max-age=${ONE_YEAR}; samesite=lax`;

export const readSidebarCollapsed = (value: string | undefined) => value === "1";
