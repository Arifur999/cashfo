// Settings › Security › App lock: a 4-digit PIN that opens Smartly on this
// device, asked again after a few minutes away, and amounts hidden when
// the app opens. All of it lives in this browser only (localStorage): the
// PIN as a salted SHA-256, never the digits. It is a screen over the app
// for someone picking up the device, not a second password; forgetting it
// means signing in again, which clears it.

// Kept per person (":<userId>"), so two people on one browser never share one.
export const APP_LOCK_KEY = "smartly-app-lock";
// When this device last had the app open (ms), to tell how long it was away.
export const APP_SEEN_KEY = "smartly-app-seen";
// This tab was unlocked (sessionStorage): a reload within the minutes away
// doesn't ask again.
export const APP_OPEN_KEY = "smartly-app-open";
export const APP_LOCK_EVENT = "smartly-app-lock";
export const LOCK_AFTER = [1, 5, 15] as const;
export type LockAfter = (typeof LOCK_AFTER)[number];
// Wrong PINs before the app signs out.
export const MAX_PIN_TRIES = 5;

export interface AppLock {
  on: boolean;
  salt: string;
  hash: string;
  after: LockAfter;
  hide: boolean;
}

export const NO_LOCK: AppLock = { on: false, salt: "", hash: "", after: 5, hide: false };

export function parseAppLock(raw: string | null): AppLock {
  if (!raw) return NO_LOCK;
  try {
    const value = JSON.parse(raw) as Partial<AppLock>;
    const after = LOCK_AFTER.includes(value.after as LockAfter) ? (value.after as LockAfter) : 5;
    const on = value.on === true && typeof value.hash === "string" && value.hash.length === 64 && typeof value.salt === "string";
    return { on, salt: on ? value.salt! : "", hash: on ? value.hash! : "", after, hide: value.hide === true };
  } catch {
    return NO_LOCK;
  }
}

// Easy to guess: one digit four times, a run up or down, or the patterns
// people reach for first.
export function weakPin(pin: string): boolean {
  return /^(\d)\1{3}$/.test(pin) || "0123456789".includes(pin) || "9876543210".includes(pin) || pin === "1122" || pin === "2580";
}

// What is wrong with a new PIN and its repeat (dictionary keys), or null.
export function pinProblem(pin: string, again: string): { field: "pin" | "again"; reason: string } | null {
  if (!/^\d{4}$/.test(pin)) return { field: "pin", reason: "Use exactly 4 digits." };
  if (weakPin(pin)) return { field: "pin", reason: "Too easy to guess. Avoid 1234, 0000 and the like." };
  if (again !== pin) return { field: "again", reason: "The two PINs are not the same." };
  return null;
}

// Whether the app should ask for the PIN now: on, and either this tab was
// never unlocked or the device was away at least `after` minutes.
export function lockedNow(lock: AppLock, state: { openInTab: boolean; lastSeen: number | null; now: number }): boolean {
  if (!lock.on) return false;
  if (!state.openInTab || state.lastSeen === null) return true;
  return state.now - state.lastSeen >= lock.after * 60_000;
}

const hex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");

export async function hashPin(pin: string, salt: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${pin}`)));
}

export const newSalt = () => hex(crypto.getRandomValues(new Uint8Array(16)).buffer);

// Browser storage, any of which may be blocked: then the lock is off.
export function readAppLock(userId: string): AppLock {
  try {
    return parseAppLock(window.localStorage.getItem(`${APP_LOCK_KEY}:${userId}`));
  } catch {
    return NO_LOCK;
  }
}

export function saveAppLock(userId: string, lock: AppLock) {
  try {
    if (lock.on || lock.hide || lock.after !== 5) window.localStorage.setItem(`${APP_LOCK_KEY}:${userId}`, JSON.stringify(lock));
    else window.localStorage.removeItem(`${APP_LOCK_KEY}:${userId}`);
  } catch {
    // Blocked storage: the lock can't be kept on this device.
  }
  window.dispatchEvent(new Event(APP_LOCK_EVENT));
}

// Signing out after a forgotten PIN, or too many wrong ones: the lock goes
// with it, and the sign-in proves who it is.
export function clearAppLock(userId: string) {
  try {
    window.localStorage.removeItem(`${APP_LOCK_KEY}:${userId}`);
    window.localStorage.removeItem(APP_SEEN_KEY);
    window.sessionStorage.removeItem(APP_OPEN_KEY);
  } catch {
    // Nothing kept, nothing to clear.
  }
}

// This tab may stay open: the PIN was right (or the lock was just set here).
export function markAppOpen() {
  try {
    window.sessionStorage.setItem(APP_OPEN_KEY, "1");
    window.localStorage.setItem(APP_SEEN_KEY, String(Date.now()));
  } catch {
    // Blocked storage: the lock asks again next time.
  }
}
