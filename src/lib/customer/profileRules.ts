import { toEnglishDigits } from "./money";

// Settings › Profile (SettingsProfile board): what the name and phone boxes
// accept, and what the save bar says. The words are dictionary keys.

// Letters in any script (Bangla too), with the marks they carry, spaces and
// the dots, hyphens and apostrophes names have.
const NAME = /^[\p{L}\p{M}][\p{L}\p{M}\s.'-]*$/u;

export function nameProblem(raw: string): string | null {
  const name = raw.trim();
  if (!name) return "Type your name.";
  if ([...name.replace(/[\s.'-]/g, "")].length < 2) return "Use at least 2 letters.";
  if ([...name].length > 40) return "Keep it under 40 letters.";
  if (!NAME.test(name)) return "Use letters only, no numbers or symbols.";
  return null;
}

// The part after the box's +880: empty is fine (the phone is optional),
// otherwise all ten digits of a Bangladeshi mobile (13 to 19).
export function phoneProblem(local: string): string | null {
  const digits = toEnglishDigits(local).replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length !== 10) return "Type all 10 digits after +880, like 1711-482915.";
  if (!/^1[3-9]/.test(digits)) return "Use a Bangladesh mobile number that starts with 13 to 19.";
  return null;
}

export interface ProfileChanges {
  name: boolean;
  phone: boolean;
  // The phone was there and is now empty.
  phoneRemoved: boolean;
  address: boolean;
}

// The save bar's sentence: a problem first, then what changed, then the
// calm states.
export function saveBarText(changes: ProfileChanges, state: { invalid: boolean; saving: boolean; justSaved: boolean }): string {
  if (state.saving) return "Saving…";
  if (state.invalid) return "Fix the field marked in red first.";
  const count = [changes.name, changes.phone, changes.address].filter(Boolean).length;
  if (count === 0) return state.justSaved ? "All changes saved." : "No changes yet.";
  if (changes.address && count > 1) return "You changed {count} things.";
  if (changes.name && changes.phone) return "You changed your name and phone number.";
  if (changes.name) return "You changed your name.";
  if (changes.phone) return changes.phoneRemoved ? "You removed your phone number." : "You changed your phone number.";
  return "You changed your address.";
}
