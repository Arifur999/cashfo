"use client";

import { LockKeyhole } from "lucide-react";
import { useCallback, useState, useSyncExternalStore, useTransition } from "react";
import { logoutAction } from "@/app/-actions/authActions";
import Loader from "@/components/shared/Loader";
import Logo from "@/components/smartly/Logo";
import PinBoxes from "@/components/smartly/PinBoxes";
import { APP_OPEN_KEY, APP_SEEN_KEY, clearAppLock, hashPin, lockedNow, markAppOpen, MAX_PIN_TRIES, readAppLock } from "@/lib/customer/appLock";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useAppLock } from "./useAppLock";

// The dashboard's hidden-amounts choice (useAmountsHidden), set when the
// app opens with "Hide balances" on.
const AMOUNTS_KEY = "smartly-dashboard-amounts";
const STORED_CHOICE_EVENT = "smartly-stored-choice";
const SEEN_EVERY_MS = 20_000;

function seenAt(): number | null {
  try {
    const value = Number(window.localStorage.getItem(APP_SEEN_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function openInTab(): boolean {
  try {
    return window.sessionStorage.getItem(APP_OPEN_KEY) === "1";
  } catch {
    return false;
  }
}

function touch() {
  try {
    window.localStorage.setItem(APP_SEEN_KEY, String(Date.now()));
  } catch {
    // Blocked storage: the lock asks again on every return.
  }
}

// Whether the screen is up: decided when the app starts in this tab and
// again whenever it comes back into view.
const gate = { locked: false, started: false };
const listeners = new Set<() => void>();
const setLocked = (locked: boolean) => {
  gate.locked = locked;
  listeners.forEach((listener) => listener());
};

function start(userId: string) {
  const lock = readAppLock(userId);
  const fresh = !openInTab();
  gate.locked = lockedNow(lock, { openInTab: !fresh, lastSeen: seenAt(), now: Date.now() });
  if (lock.hide && fresh) {
    try {
      window.localStorage.setItem(AMOUNTS_KEY, "hidden");
      window.dispatchEvent(new Event(STORED_CHOICE_EVENT));
    } catch {
      // Blocked storage: the amounts show as they were.
    }
  }
  if (!gate.locked) markAppOpen();
  window.setInterval(() => document.visibilityState === "visible" && !gate.locked && touch(), SEEN_EVERY_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return void (gate.locked || touch());
    if (lockedNow(readAppLock(userId), { openInTab: openInTab(), lastSeen: seenAt(), now: Date.now() })) setLocked(true);
    else if (!gate.locked) touch();
  });
}

// Settings › Security › App lock on this device: the PIN screen over the
// app when it opens in a new tab or after the minutes away, and the
// amounts hidden as it opens. Too many wrong PINs, or a forgotten one,
// sign out (the lock goes too; signing in again proves who it is).
export function AppLockGate({ userId }: { userId: string }) {
  const { t, fmt } = useLocale();
  const lock = useAppLock(userId);
  const subscribe = useCallback(
    (onChange: () => void) => {
      listeners.add(onChange);
      if (!gate.started) {
        gate.started = true;
        start(userId);
        onChange();
      }
      return () => void listeners.delete(onChange);
    },
    [userId],
  );
  const locked = useSyncExternalStore(subscribe, () => gate.locked, () => false);
  const [pin, setPin] = useState("");
  const [wrong, setWrong] = useState(0);
  const [checking, setChecking] = useState(false);
  const [signingOut, startSigningOut] = useTransition();

  if (!locked || !lock.on) return null;

  const signOut = () =>
    startSigningOut(() => {
      clearAppLock(userId);
      return logoutAction();
    });

  async function check(value: string) {
    if (value.length !== 4 || checking) return;
    setChecking(true);
    const right = (await hashPin(value, lock.salt)) === lock.hash;
    setChecking(false);
    setPin("");
    if (right) {
      markAppOpen();
      setWrong(0);
      setLocked(false);
      return;
    }
    const tries = wrong + 1;
    setWrong(tries);
    if (tries >= MAX_PIN_TRIES) signOut();
  }

  const left = MAX_PIN_TRIES - wrong;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="app-lock-title" className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 bg-page px-6">
      <Logo />
      <div className="flex w-full max-w-90 flex-col items-center gap-4 rounded-card border border-line-card bg-surface px-6 py-7 text-center shadow-card">
        <span className="flex size-12 items-center justify-center rounded-[14px] bg-mint-50 text-primary">
          <LockKeyhole className="size-5.5" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h1 id="app-lock-title" className="text-[18px] font-semibold text-ink">
            {t("Enter your PIN")}
          </h1>
          <p className="text-small text-ink-muted">{t("Smartly is locked on this device.")}</p>
        </div>
        <PinBoxes
          value={pin}
          maxLength={4}
          label={t("Your 4-digit PIN")}
          autoFocus
          disabled={checking || signingOut}
          invalid={wrong > 0 && pin.length === 0}
          onChange={(value) => {
            setPin(value);
            if (value.length === 4) void check(value);
          }}
        />
        <p role="alert" className="min-h-4.5 text-[12.5px] text-expense">
          {wrong > 0 && left > 0 ? t(left === 1 ? "Wrong PIN. {count} try left, then you are signed out." : "Wrong PIN. {count} tries left.", { count: formatCount(left, fmt) }) : ""}
        </p>
        <button type="button" onClick={signOut} disabled={signingOut} className="inline-flex items-center gap-1.5 text-small font-semibold text-emerald hover:underline disabled:opacity-60">
          {signingOut && <Loader size={12} />}
          {t("Forgot your PIN? Sign out")}
        </button>
      </div>
    </div>
  );
}
