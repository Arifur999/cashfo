import { enumOptions, humanizeEnum } from "@/lib/statusBadge";
import { ACCOUNT_TYPES, TEMPLATE_WORKSPACE_TYPES, type IAccountTemplate } from "@/types/accountTemplate.types";

export const ACCOUNT_TYPE_OPTIONS = enumOptions(ACCOUNT_TYPES);
export const WORKSPACE_TYPE_OPTIONS = enumOptions(TEMPLATE_WORKSPACE_TYPES);

// The subtypes the apps know, and how each reads beside an account in the
// tree. Savings is what savings goals keep money in.
export const SUBTYPE_LABELS: Record<string, string> = {
  cash: "Cash",
  bank: "Bank",
  mfs: "Mobile wallet",
  card: "Card",
  savings: "Savings",
  loan: "Loan",
  receivable: "Receivable",
  payable: "Payable",
  "fixed-assets": "Fixed assets",
  "referral-bonus": "Referral bonus",
};

// The accounts the app seeds and posts through itself (loans, credit sales,
// assets, referral payouts). The API refuses them on any other template, and
// refuses changing them on the one that has it.
export const RESERVED_SUBTYPES: readonly string[] = ["receivable", "payable", "fixed-assets", "referral-bonus"];

export const isReservedSubtype = (subtype: string | null | undefined) => Boolean(subtype && RESERVED_SUBTYPES.includes(subtype));

// Radix Select can't hold "", so "no subtype" needs a value of its own;
// the form turns it back into "" before saving.
export const NO_SUBTYPE = "none";

// The subtype picker: none, then the known ones the API accepts here (a
// reserved one only on the template that already has it). A value saved
// before the picker existed (typed by hand) stays pickable, so editing
// doesn't drop it.
export const buildSubtypeOptions = (current: string) => [
  { value: NO_SUBTYPE, label: "No subtype" },
  ...Object.entries(SUBTYPE_LABELS)
    .filter(([value]) => !RESERVED_SUBTYPES.includes(value) || value === current)
    .map(([value, label]) => ({ value, label })),
  ...(current && current !== NO_SUBTYPE && !Object.hasOwn(SUBTYPE_LABELS, current) ? [{ value: current, label: humanizeEnum(current.toUpperCase()) }] : []),
];

// A group (an account with sub-accounts, or a top-level one with no kind)
// shows nothing; a leaf shows its kind.
export const accountKindLabel = (template: IAccountTemplate) => {
  if (template.children?.length) return "";
  if (template.accountSubtype) return SUBTYPE_LABELS[template.accountSubtype] ?? humanizeEnum(template.accountSubtype.toUpperCase());
  return template.parentId ? humanizeEnum(template.accountType) : "";
};
