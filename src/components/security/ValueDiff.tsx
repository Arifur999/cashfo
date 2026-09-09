import { t } from "@/lib/i18n/t";

function flatten(value: unknown, prefix = ""): Record<string, string> {
  if (value === null || value === undefined) return {};
  if (typeof value !== "object") return { [prefix || "value"]: String(value) };

  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      Object.assign(result, flatten(val, path));
    } else {
      result[path] = Array.isArray(val) ? JSON.stringify(val) : String(val);
    }
  }
  return result;
}

interface ValueDiffProps {
  oldValue: unknown;
  newValue: unknown;
}

export function ValueDiff({ oldValue, newValue }: ValueDiffProps) {
  const oldFlat = flatten(oldValue);
  const newFlat = flatten(newValue);
  const keys = [...new Set([...Object.keys(oldFlat), ...Object.keys(newFlat)])];

  if (keys.length === 0) {
    return <p className="text-sm text-neutral-400">{t("No additional detail was recorded for this entry.")}</p>;
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-3 px-4 text-xs font-medium uppercase text-neutral-400">
        <span>{t("Field")}</span>
        <span>{t("Before")}</span>
        <span>{t("After")}</span>
      </div>
      {keys.map((key) => {
        const before = oldFlat[key];
        const after = newFlat[key];
        const changed = before !== undefined && after !== undefined && before !== after;
        return (
          <div key={key} className="grid grid-cols-3 gap-3 rounded-xl bg-neutral-50 px-4 py-2.5 text-sm">
            <span className="font-medium text-neutral-600">{key}</span>
            <span className={changed ? "text-brand-danger line-through" : "text-neutral-700"}>{before ?? "—"}</span>
            <span className={changed ? "font-medium text-brand-primary" : "text-neutral-700"}>{after ?? "—"}</span>
          </div>
        );
      })}
    </div>
  );
}
