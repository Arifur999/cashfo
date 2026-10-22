// Web push, the pure parts: turning the server's VAPID key into the bytes
// pushManager.subscribe() wants, telling what this device can do, and the
// subscription as the API takes it. The browser calls themselves live in
// hooks/usePushSubscription.ts.
import type { PushSubscriptionInput } from "@/lib/customer/api";

// The server's public key arrives as URL-safe base64 without padding.
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

// Whether a subscription was made with this key. One made with an older key
// (the server's keys were replaced) can't be reached any more, and the
// browser refuses a new subscribe() until it is removed.
export function sameKey(current: ArrayBuffer | null | undefined, key: Uint8Array): boolean {
  if (!current) return false;
  const bytes = new Uint8Array(current);
  return bytes.length === key.length && bytes.every((byte, i) => byte === key[i]);
}

// How notifications stand on this device:
//   loading      not worked out yet (the first render, on the server)
//   unsupported  this browser has no web push
//   ios-install  an iPhone or iPad: push works once Smartly is on the Home Screen
//   unavailable  the server has no push keys, so nothing can be sent
//   blocked      the person said no; only the browser's site settings undo it
//   off          can be turned on
//   on           this device is subscribed
export type PushStatus = "loading" | "unsupported" | "ios-install" | "unavailable" | "blocked" | "off" | "on";

export interface PushEnvironment {
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
  isIOS: boolean;
  isStandalone: boolean;
}

// What the browser offers, before permission or a subscription is asked
// about. iOS Safari has no PushManager outside a Home Screen app, so an
// iPhone that isn't installed is told to install rather than "unsupported".
export function pushSupport(env: PushEnvironment): "supported" | "unsupported" | "ios-install" {
  if (env.hasServiceWorker && env.hasPushManager && env.hasNotification) return "supported";
  return env.isIOS && !env.isStandalone ? "ios-install" : "unsupported";
}

// iPhones, and iPads, which call themselves a Mac with a touch screen.
export function isIOSDevice(userAgent: string, platform = "", maxTouchPoints = 0): boolean {
  return /iPad|iPhone|iPod/.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
}

// The parts of PushSubscription.toJSON() the API stores, or null when the
// browser left any out.
export function subscriptionInput(json: { endpoint?: string; keys?: Record<string, string> }, locale: "en" | "bn"): PushSubscriptionInput | null {
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!json.endpoint || !p256dh || !auth) return null;
  return { endpoint: json.endpoint, keys: { p256dh, auth }, locale };
}
