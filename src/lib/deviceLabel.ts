import type { Translate } from "@/lib/i18n/message";

// The backend names a sign-in's device in English from its User-Agent
// (cashfo_backend/src/user-auth/device-label.ts): "Chrome on Windows",
// "Chrome on Linux (Mobile)", "Unknown device". The browser and system names
// stay as they are; the words around them follow the reader's language.
const LABEL = /^(.+) on (.+?)( \(Mobile\))?$/;

export const deviceLabelText = (label: string, t: Translate): string => {
  const match = label.match(LABEL);
  if (!match) return t(label);
  const [, browser, os, mobile] = match;
  const text = t("{browser} on {os}", { browser: t(browser), os: t(os) });
  return mobile ? `${text} ${t("(Mobile)")}` : text;
};
