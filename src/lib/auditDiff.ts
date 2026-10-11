// Turns an audit entry's free-form before/after JSON snapshots into
// field-by-field rows for the "What changed" view (unit-tested).

export interface AuditDiffRow {
  // Dotted path for nested values: "featureLimits.maxWorkspaces".
  field: string;
  before: string | undefined;
  after: string | undefined;
  changed: boolean;
}

const toText = (value: unknown): string => {
  if (value === null) return "null";
  if (Array.isArray(value)) return JSON.stringify(value);
  return String(value);
};

export const flattenAuditValue = (value: unknown, prefix = ""): Record<string, string> => {
  if (value === null || value === undefined) {
    return {};
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    return { [prefix || "value"]: toText(value) };
  }

  const result: Record<string, string> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (nested !== null && typeof nested === "object" && !Array.isArray(nested)) {
      Object.assign(result, flattenAuditValue(nested, path));
    } else {
      result[path] = toText(nested);
    }
  }
  return result;
};

// Every field present on either side, in first-seen order. A field only
// counts as changed when both sides have it and the values differ; one-sided
// fields (added / removed) are shown as-is.
export const diffAuditValues = (before: unknown, after: unknown): AuditDiffRow[] => {
  const beforeFlat = flattenAuditValue(before);
  const afterFlat = flattenAuditValue(after);
  const fields = [...new Set([...Object.keys(beforeFlat), ...Object.keys(afterFlat)])];

  return fields.map((field) => ({
    field,
    before: beforeFlat[field],
    after: afterFlat[field],
    changed: field in beforeFlat && field in afterFlat && beforeFlat[field] !== afterFlat[field],
  }));
};

// The backend marks sensitive actions (impersonation, data resets, ...) with
// newValue.sensitive === true.
export const isSensitiveAuditEntry = (newValue: unknown): boolean =>
  Boolean(newValue && typeof newValue === "object" && (newValue as { sensitive?: unknown }).sensitive === true);
