export type DateRangePreset = "this-month" | "last-month" | "this-year" | "custom" | "all";

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Resolves a named preset into concrete dateFrom/dateTo strings the backend
// understands. "all" / no preset means no filter at all (both undefined).
export function resolveDateRange(preset: DateRangePreset | undefined, customFrom?: string, customTo?: string): { dateFrom?: string; dateTo?: string } {
  const now = new Date();

  switch (preset) {
    case "this-month": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { dateFrom: toDateInputValue(from), dateTo: toDateInputValue(now) };
    }
    case "last-month": {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      return { dateFrom: toDateInputValue(from), dateTo: toDateInputValue(to) };
    }
    case "this-year": {
      const from = new Date(now.getFullYear(), 0, 1);
      return { dateFrom: toDateInputValue(from), dateTo: toDateInputValue(now) };
    }
    case "custom":
      return { dateFrom: customFrom, dateTo: customTo };
    default:
      return {};
  }
}
