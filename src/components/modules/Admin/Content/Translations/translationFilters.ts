import type { DataTableFilterConfig } from "@/components/shared/table/dataTable.types";
import type { ITranslation } from "@/types/translation.types";

export const isMissingBangla = (translation: ITranslation) => translation.bn.trim() === "";

export const banglaStatusOf = (translation: ITranslation) => (isMissingBangla(translation) ? "MISSING" : "TRANSLATED");

// The context options are whatever groups the strings use, so they're built
// from the data (memoize the result -- it must stay stable).
export const buildTranslationFilters = (translations: ITranslation[]): DataTableFilterConfig[] => {
  const contexts = [...new Set(translations.map((translation) => translation.context).filter((context) => context !== null))].sort();

  return [
    { id: "context", type: "multi-select", label: "Context", options: contexts.map((context) => ({ value: context, label: context })) },
    {
      id: "banglaStatus",
      type: "single-select",
      label: "Bangla",
      options: [
        { value: "TRANSLATED", label: "Translated" },
        { value: "MISSING", label: "Missing" },
      ],
    },
  ];
};
