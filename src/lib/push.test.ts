import { describe, expect, it } from "vitest";
import { isIOSDevice, pushSupport, sameKey, subscriptionInput, urlBase64ToUint8Array } from "./push";

const supported = { hasServiceWorker: true, hasPushManager: true, hasNotification: true, isIOS: false, isStandalone: false };

describe("urlBase64ToUint8Array", () => {
  it("reads URL-safe base64 without padding", () => {
    // "+/8=" in standard base64 is the bytes fb ff.
    expect(Array.from(urlBase64ToUint8Array("-_8"))).toEqual([0xfb, 0xff]);
  });

  it("reads a 65-byte VAPID public key", () => {
    const bytes = new Uint8Array(65).map((_, i) => (i * 37) % 256);
    const encoded = Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(Array.from(urlBase64ToUint8Array(encoded))).toEqual(Array.from(bytes));
  });

  it("reads one that still has its padding", () => {
    expect(Array.from(urlBase64ToUint8Array("AQI="))).toEqual([1, 2]);
  });
});

describe("sameKey", () => {
  it("matches the same bytes only", () => {
    const key = new Uint8Array([1, 2, 3]);
    expect(sameKey(new Uint8Array([1, 2, 3]).buffer, key)).toBe(true);
    expect(sameKey(new Uint8Array([1, 2, 4]).buffer, key)).toBe(false);
    expect(sameKey(new Uint8Array([1, 2]).buffer, key)).toBe(false);
    expect(sameKey(null, key)).toBe(false);
  });
});

describe("pushSupport", () => {
  it("is supported with a service worker, PushManager and Notification", () => {
    expect(pushSupport(supported)).toBe("supported");
  });

  it("asks an iPhone to add the app to its Home Screen first", () => {
    expect(pushSupport({ ...supported, hasPushManager: false, isIOS: true })).toBe("ios-install");
  });

  it("calls an installed iPhone without push, or any other browser, unsupported", () => {
    expect(pushSupport({ ...supported, hasPushManager: false, isIOS: true, isStandalone: true })).toBe("unsupported");
    expect(pushSupport({ ...supported, hasNotification: false })).toBe("unsupported");
  });
});

describe("isIOSDevice", () => {
  it("knows iPhones and iPads, even an iPad that says it is a Mac", () => {
    expect(isIOSDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)")).toBe(true);
    expect(isIOSDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "MacIntel", 5)).toBe(true);
    expect(isIOSDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "MacIntel", 0)).toBe(false);
    expect(isIOSDevice("Mozilla/5.0 (Linux; Android 14)")).toBe(false);
  });
});

describe("subscriptionInput", () => {
  it("keeps the endpoint, the keys and the language", () => {
    expect(subscriptionInput({ endpoint: "https://push.example/1", keys: { p256dh: "p", auth: "a" } }, "bn")).toEqual({
      endpoint: "https://push.example/1",
      keys: { p256dh: "p", auth: "a" },
      locale: "bn",
    });
  });

  it("is null when the browser left a part out", () => {
    expect(subscriptionInput({ endpoint: "https://push.example/1", keys: { p256dh: "p" } }, "en")).toBeNull();
    expect(subscriptionInput({ keys: { p256dh: "p", auth: "a" } }, "en")).toBeNull();
  });
});
