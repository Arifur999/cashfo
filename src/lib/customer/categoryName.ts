// A new category's name, checked before it is sent: the same rules the
// backend keeps (budgets.service.ts, app-categories.ts), so the reader is
// told at once and in their language.

// The names the app files money under itself: the Zakat page, the charge
// on a transfer or loan entry, and money with no category.
export const RESERVED_CATEGORY_NAMES = ["Zakat", "Bank charge", "Mobile banking fee", "Service charge", "Uncategorised"];

// The backend's MaxLength on a category name.
export const CATEGORY_NAME_MAX = 40;

const RESERVED = new Set(RESERVED_CATEGORY_NAMES.map((name) => name.toLowerCase()));

// The dictionary key of what is wrong with the name, or null when it can be
// added. `taken` is the names of the same type already in the workspace;
// "food" next to "Food" counts as the same.
export function categoryNameError(raw: string, taken: readonly string[]): string | null {
  const name = raw.trim();
  if (!name) return "Type a name first.";
  const key = name.toLowerCase();
  if (RESERVED.has(key)) return "That name is used by the app for Zakat or transfer fees";
  if (taken.some((other) => other.trim().toLowerCase() === key)) return "That category already exists.";
  return null;
}

// The backend's refusal as a key: its "already exists" text names the
// category in English, so it is read as the one plain sentence.
export const categoryServerError = (message: string | undefined): string => (message && /already exists$/.test(message) ? "That category already exists." : (message ?? "Failed to create category"));
