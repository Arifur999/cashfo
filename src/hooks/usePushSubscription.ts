"use client";

import { useCallback, useEffect, useEffectEvent, useState } from "react";
import { sendTestPushAction, subscribePushAction, unsubscribePushAction } from "@/lib/customer/remindersActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { isIOSDevice, pushSupport, sameKey, subscriptionInput, urlBase64ToUint8Array, type PushStatus } from "@/lib/push";

// Web push on this device: whether it can, whether it is on, and turning it
// on and off. The service worker is public/sw.js (push + notificationclick
// only); the server keeps one subscription per device, written in the
// language the device last sent.
//
//   const push = usePushSubscription(publicKey);   // the key from getPushPublicKey()
//   push.status   // "loading" | "unsupported" | "ios-install" | "unavailable" | "blocked" | "off" | "on"
//   push.busy     // a turnOn/turnOff/sendTest is under way
//   await push.turnOn()    // asks permission, registers /sw.js, subscribes, saves it -> PushOutcome
//   await push.turnOff()   // unsubscribes this device and forgets it on the server -> PushOutcome
//   await push.sendTest()  // a test notification to every device turned on -> PushOutcome (sent)
//
// usePushStatus() is the read-only half, for hints that only need to know
// whether this device will be told; usePushResync() re-sends the
// subscription on app load so its language stays right.

const SW_URL = "/sw.js";

// What a turnOn/turnOff/sendTest came to. `message` is an English dictionary
// key for the caller to translate.
export interface PushOutcome {
  ok: boolean;
  message?: string;
  sent?: number;
}

function deviceSupport() {
  if (typeof window === "undefined") return "unsupported" as const;
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return pushSupport({
    hasServiceWorker: "serviceWorker" in navigator,
    hasPushManager: "PushManager" in window,
    hasNotification: "Notification" in window,
    isIOS: isIOSDevice(navigator.userAgent, navigator.platform, navigator.maxTouchPoints),
    isStandalone: standalone,
  });
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration("/");
  return registration ? registration.pushManager.getSubscription() : null;
}

// `publicKey` undefined: the caller doesn't know whether the server can push
// (a hint inside the habit pages), so "unavailable" is never answered.
async function readStatus(publicKey?: string | null): Promise<PushStatus> {
  const support = deviceSupport();
  if (support !== "supported") return support;
  if (publicKey === null) return "unavailable";
  if (Notification.permission === "denied") return "blocked";
  if (Notification.permission !== "granted") return "off";
  try {
    return (await currentSubscription()) ? "on" : "off";
  } catch {
    return "off";
  }
}

// How notifications stand on this device, read after mount (the server and
// the first render say "loading") and again whenever the tab comes back, in
// case the browser's site settings were changed meanwhile.
export function usePushStatus(publicKey?: string | null) {
  const [status, setStatus] = useState<PushStatus>("loading");
  const refresh = useCallback(() => readStatus(publicKey).then(setStatus), [publicKey]);
  const refreshEvent = useEffectEvent(refresh);

  useEffect(() => {
    void refreshEvent();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshEvent();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [publicKey]);

  return { status, setStatus, refresh };
}

export function usePushSubscription(publicKey: string | null) {
  const { locale } = useLocale();
  const { status, setStatus, refresh } = usePushStatus(publicKey);
  const [busy, setBusy] = useState(false);

  async function run(work: () => Promise<PushOutcome>): Promise<PushOutcome> {
    setBusy(true);
    try {
      return await work();
    } finally {
      setBusy(false);
    }
  }

  // Permission is asked first, straight from the tap: Safari only shows its
  // prompt when it comes from a user gesture.
  const turnOn = () =>
    run(async () => {
      if (!publicKey || deviceSupport() !== "supported") return { ok: false, message: "Notifications aren't available on this device." };
      const permission = await Notification.requestPermission();
      if (permission === "denied") {
        setStatus("blocked");
        return { ok: false, message: "Notifications are blocked for this site." };
      }
      if (permission !== "granted") return { ok: false };
      try {
        const registration = await navigator.serviceWorker.register(SW_URL, { scope: "/", updateViaCache: "none" });
        await navigator.serviceWorker.ready;
        const key = urlBase64ToUint8Array(publicKey);
        // One made with the server's old key can't be reached any more, and
        // blocks a new subscribe() until it is gone.
        let subscription = await registration.pushManager.getSubscription();
        if (subscription && !sameKey(subscription.options.applicationServerKey, key)) {
          await subscription.unsubscribe();
          subscription = null;
        }
        subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
        const input = subscriptionInput(subscription.toJSON(), locale);
        if (!input) return { ok: false, message: "Couldn't turn on notifications on this device" };
        const saved = await subscribePushAction(input);
        if (!saved.success) {
          // Not saved, so nothing would arrive: don't leave it looking on.
          await subscription.unsubscribe().catch(() => false);
          return { ok: false, message: saved.message ?? "Couldn't turn on notifications on this device" };
        }
        setStatus("on");
        return { ok: true };
      } catch {
        await refresh();
        return { ok: false, message: "Couldn't turn on notifications on this device" };
      }
    });

  const turnOff = () =>
    run(async () => {
      try {
        const subscription = await currentSubscription();
        if (subscription) {
          const { endpoint } = subscription;
          await subscription.unsubscribe();
          // The browser's side is what stops the notifications; a failed
          // call here only leaves the server a dead address it drops on the
          // next send (404/410).
          await unsubscribePushAction(endpoint);
        }
        setStatus("off");
        return { ok: true };
      } catch {
        await refresh();
        return { ok: false, message: "Couldn't turn off notifications on this device" };
      }
    });

  const sendTest = () =>
    run(async () => {
      const result = await sendTestPushAction();
      if (!result.success) return { ok: false, message: result.message ?? "Couldn't send a test notification" };
      return { ok: true, sent: result.data?.sent ?? 0 };
    });

  return { status, busy, turnOn, turnOff, sendTest, refresh };
}

// Re-sends this device's subscription, with the reader's language, when the
// app loads (and when the language changes), so notifications keep coming in
// the right language and a subscription the server lost is saved again.
// Silent: nothing to show if it fails. Off for a read-only "View as
// customer" session, whose device is the admin's.
export function usePushResync(enabled = true) {
  const { locale } = useLocale();
  useEffect(() => {
    if (!enabled || deviceSupport() !== "supported" || Notification.permission !== "granted") return;
    let cancelled = false;
    currentSubscription()
      .then((subscription) => {
        const input = subscription ? subscriptionInput(subscription.toJSON(), locale) : null;
        if (input && !cancelled) return subscribePushAction(input);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [enabled, locale]);
}
