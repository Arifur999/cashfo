import type { DataTableFilterConfig } from "@/components/shared/table/dataTable.types";
import type { ITranslation } from "@/types/translation.types";

export const isMissingBangla = (translation: ITranslation) => translation.bn.trim() === "";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const isChangedThisWeek = (translation: ITranslation, now: Date = new Date()) => now.getTime() - new Date(translation.updatedAt).getTime() < WEEK_MS;

// What a string needs attention for, as the tabs group it. A string can be
// both, so this is a list the tabs filter matches on.
export const flagsOf = (translation: ITranslation): string[] => [
  ...(isMissingBangla(translation) ? ["MISSING"] : []),
  ...(isChangedThisWeek(translation) ? ["CHANGED"] : []),
];

// The tabs and the area chip, with the counts from the list itself (memoize
// the result -- it must stay stable).
export const buildTranslationFilters = (translations: ITranslation[]): DataTableFilterConfig[] => {
  const contexts = [...new Set(translations.map((translation) => translation.context).filter((context) => context !== null))].sort();
  const missing = translations.filter(isMissingBangla).length;
  const changed = translations.filter((translation) => isChangedThisWeek(translation)).length;

  return [
    {
      id: "flags",
      type: "tabs",
      label: "Show",
      options: [
        { value: "MISSING", label: "Missing Bangla", count: missing },
        { value: "CHANGED", label: "Changed this week", count: changed },
      ],
    },
    { id: "context", type: "multi-select", label: "Area", options: contexts.map((context) => ({ value: context, label: context })) },
  ];
};
