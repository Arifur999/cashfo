import type { DataTableFilterConfig } from "@/components/shared/table/dataTable.types";
import { enumOptions, humanizeEnum } from "@/lib/statusBadge";
import type { IAccountTemplate } from "@/types/accountTemplate.types";
import { CATEGORY_DIRECTIONS, type CategoryDirection } from "@/types/category.types";
import { NO_LINKED_ACCOUNT } from "@/zod/category.validation";
import { inEnglish, localName, type Translate } from "@/lib/i18n/message";

export const CATEGORY_DIRECTION_OPTIONS = enumOptions(CATEGORY_DIRECTIONS);

// In-memory filters: `id` is the column to facet on.
export const CATEGORY_FILTERS: DataTableFilterConfig[] = [
  { id: "type", type: "single-select", label: "Type", options: CATEGORY_DIRECTION_OPTIONS },
  { id: "status", type: "single-select", label: "Status", options: enumOptions(["ACTIVE", "INACTIVE"]) },
];

// Accounts of the category's own direction come first; the rest follow,
// labelled with their type (a loan repayment may book against a liability).
// Inactive accounts are left out unless the category already links one.
export const buildLinkedAccountOptions = (
  templates: IAccountTemplate[],
  direction: CategoryDirection,
  currentId?: string | null,
  { t = inEnglish, locale = "en" }: { t?: Translate; locale?: "en" | "bn" } = {},
) => {
  const accounts = templates
    .flatMap((template) => [template, ...(template.children ?? [])])
    .filter((account) => account.isActive || account.id === currentId);

  return [
    { value: NO_LINKED_ACCOUNT, label: "Not linked" },
    ...accounts.filter((account) => account.accountType === direction).map((account) => ({ value: account.id, label: localName(locale, account) })),
    ...accounts
      .filter((account) => account.accountType !== direction)
      .map((account) => ({ value: account.id, label: `${localName(locale, account)} (${t(humanizeEnum(account.accountType))})` })),
  ];
};
