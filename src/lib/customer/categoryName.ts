// A new or renamed category's name, checked before it is sent: the same
// rules the backend keeps (budgets.service.ts, app-categories.ts), so the
// reader is told at once and in their language. Each form says it in its
// own board's words (CATEGORY_NAME_WORDS).

// The names the app files money under itself: the Zakat page, the charge
// on a transfer or loan entry, and money with no category.
export const RESERVED_CATEGORY_NAMES = ["Zakat", "Bank charge", "Mobile banking fee", "Service charge", "Uncategorised"];

// The backend's MaxLength on a category name.
export const CATEGORY_NAME_MAX = 40;

export type CategoryNameProblem = "empty" | "long" | "reserved" | "taken";

const RESERVED = new Set(RESERVED_CATEGORY_NAMES.map((name) => name.toLowerCase()));

// What is wrong with the name, or null when it can be saved. `taken` is the
// names of the same type already in the workspace (a category being renamed
// leaves its own out); "food" next to "Food" counts as the same.
export function categoryNameProblem(raw: string, taken: readonly string[]): CategoryNameProblem | null {
  const name = raw.trim();
  if (!name) return "empty";
  if ([...name].length > CATEGORY_NAME_MAX) return "long";
  const key = name.toLowerCase();
  if (RESERVED.has(key)) return "reserved";
  if (taken.some((other) => other.trim().toLowerCase() === key)) return "taken";
  return null;
}

// The backend's refusal in the same terms, when it is one of these: its
// "already exists" text names the category in English.
export function categoryServerProblem(message: string | undefined): CategoryNameProblem | null {
  if (!message) return null;
  if (/already exists$/.test(message)) return "taken";
  if (message.startsWith("That name is used by the app")) return "reserved";
  return null;
}

// The words for each problem: the transaction popup's (design: TxnDrawer)
// and Category Set's popup (design: CategoryDrawer).
export const CATEGORY_NAME_WORDS: Record<"popup" | "drawer", Record<CategoryNameProblem, string>> = {
  popup: {
    empty: "Type a name first.",
    long: "Keep the name to 40 characters or fewer.",
    reserved: "That name is used by the app for Zakat or transfer fees",
    taken: "That category already exists.",
  },
  drawer: {
    empty: "Type a name for the category.",
    long: "Keep the name to 40 characters or fewer.",
    reserved: "That name is used by the app for Zakat or transfer fees.",
    taken: "There is already a category with this name.",
  },
};
