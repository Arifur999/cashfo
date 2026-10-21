import type { INotificationTemplateFormValues } from "@/zod/notification.validation";

// Plain helpers for the template editor (unit-tested).

// Puts a {{placeholder}} where the caret is (or over the selected text),
// with a space before it when it would touch the word in front, and says
// where the caret goes after it.
export const insertAtCaret = (text: string, start: number, end: number, insertion: string): { text: string; caret: number } => {
  const from = Math.min(Math.max(start, 0), text.length);
  const to = Math.min(Math.max(end, from), text.length);
  const before = text.slice(0, from);
  const pad = before !== "" && !/\s$/.test(before) ? " " : "";
  return { text: `${before}${pad}${insertion}${text.slice(to)}`, caret: before.length + pad.length + insertion.length };
};

// Whether two versions of a template's wording are the same once saved
// (the API trims each field, so spaces at the ends don't count).
export const sameTemplateText = (a: INotificationTemplateFormValues, b: INotificationTemplateFormValues): boolean =>
  (Object.keys(a) as (keyof INotificationTemplateFormValues)[]).every((key) => a[key].trim() === b[key].trim());

// The GSM 7-bit alphabet an SMS carries 160 characters at a time in; the
// extension characters take two places. Anything else (Bangla, ৳, an
// emoji) sends the whole message as Unicode, 70 a time.
const GSM_BASIC = new Set("@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà");
const GSM_EXTENDED = new Set("^{}\\[~]|€\f");

export interface SmsLength {
  characters: number;
  // How many messages it goes out as: one up to 160 (or 70 in Unicode),
  // then 153 (or 67) a part, the rest of each part joining them up.
  parts: number;
  unicode: boolean;
}

export const smsLength = (text: string): SmsLength => {
  const chars = [...text];
  const unicode = chars.some((char) => !GSM_BASIC.has(char) && !GSM_EXTENDED.has(char));
  // Unicode SMS counts 16-bit units, so an emoji takes two.
  const characters = unicode ? text.length : chars.reduce((sum, char) => sum + (GSM_EXTENDED.has(char) ? 2 : 1), 0);
  const [single, perPart] = unicode ? [70, 67] : [160, 153];
  const parts = characters === 0 ? 0 : characters <= single ? 1 : Math.ceil(characters / perPart);
  return { characters, parts, unicode };
};
