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

// The fields the save bar names, in the board's words (dictionary keys).
export const PROFILE_FIELD_LABELS = {
  name: "full name",
  occupation: "occupation",
  dateOfBirth: "date of birth",
  gender: "gender",
  district: "district",
  address: "address",
  phone: "phone",
  phone2: "second phone",
  phone2WhatsApp: "WhatsApp",
} as const;
export type ProfileField = keyof typeof PROFILE_FIELD_LABELS;

// The save bar's sentence: saving, then a problem, then what changed
// ({list} is the changed fields' labels), then the calm states.
export function saveBarText(changed: ProfileField[], state: { invalid: boolean; saving: boolean; justSaved: boolean; phoneRemoved?: boolean }): string {
  if (state.saving) return "Saving…";
  if (state.invalid) return "Fix the field marked in red first.";
  if (changed.length === 0) return state.justSaved ? "All changes saved." : "No changes yet.";
  if (changed.length === 1 && changed[0] === "name") return "You changed your name.";
  if (changed.length === 1 && changed[0] === "phone") return state.phoneRemoved ? "You removed your phone number." : "You changed your phone number.";
  return "Not saved yet: {list}.";
}

// What is wrong with a date of birth (YYYY-MM-DD), against today: Smartly
// is for 13 and older, and a year before 1920 is a slip.
export function birthDateProblem(day: string, today: string): string | null {
  if (!day) return null;
  const [year, month, date] = today.split("-");
  if (day > today) return "That date is in the future.";
  if (day > `${Number(year) - 13}-${month}-${date}`) return "You need to be at least 13 to use Smartly.";
  if (day < "1920-01-01") return "Check the year.";
  return null;
}

// The second number: a mobile like the first, and not the same one.
export function secondPhoneProblem(local: string, main: string): string | null {
  const problem = phoneProblem(local);
  if (problem) return problem;
  const digits = (value: string) => toEnglishDigits(value).replace(/\D/g, "");
  return digits(local) && digits(local) === digits(main) ? "This is the same as your main number." : null;
}

// How complete the profile is: what is there, and what is left to add.
export const PROFILE_CHECKS = [
  { key: "photo", label: "Add a photo" },
  { key: "name", label: "Add your name" },
  { key: "dateOfBirth", label: "Add your date of birth" },
  { key: "gender", label: "Choose your gender" },
  { key: "occupation", label: "Add your occupation" },
  { key: "district", label: "Choose your district" },
  { key: "address", label: "Add your address" },
  { key: "phone", label: "Add a phone number" },
  { key: "email", label: "Verify your email" },
] as const;
export type ProfileCheck = (typeof PROFILE_CHECKS)[number]["key"];

export function profileCompleteness(have: Record<ProfileCheck, boolean>): { percent: number; missing: (typeof PROFILE_CHECKS)[number][] } {
  const missing = PROFILE_CHECKS.filter((check) => !have[check.key]);
  return { percent: Math.round(((PROFILE_CHECKS.length - missing.length) / PROFILE_CHECKS.length) * 100), missing };
}
