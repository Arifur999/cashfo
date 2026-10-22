import type { SearchParamsRecord } from "@/lib/queryString";
import { WHEN_OPTIONS } from "@/lib/timeWindows";

const WINDOWS: readonly string[] = WHEN_OPTIONS.map((option) => option.value);

// A `within` the API refuses (a stale or hand-edited link such as
// ?within=yesterday) fails every read, so the list would only ever show its
// error. The page sends such an address on to the same path without it, so
// the list opens on its default window. Null when the address is fine.
export const hrefWithoutUnknownWithin = (pathname: string, params: SearchParamsRecord): string | null => {
  const raw = params.within;
  if (raw === undefined) return null;
  const values = Array.isArray(raw) ? raw : [raw];
  if (values.length === 1 && WINDOWS.includes(values[0])) return null;

  const next = new URLSearchParams();
  for (const [name, value] of Object.entries(params)) {
    if (name === "within" || value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) next.append(name, item);
  }
  const rest = next.toString();
  return rest ? `${pathname}?${rest}` : pathname;
};
