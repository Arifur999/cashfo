import { enumOptions, humanizeEnum } from "@/lib/statusBadge";
import { ACCOUNT_TYPES, TEMPLATE_WORKSPACE_TYPES, type IAccountTemplate } from "@/types/accountTemplate.types";

export const ACCOUNT_TYPE_OPTIONS = enumOptions(ACCOUNT_TYPES);
export const WORKSPACE_TYPE_OPTIONS = enumOptions(TEMPLATE_WORKSPACE_TYPES);

// How an account's kind reads beside it in the tree.
const SUBTYPE_LABEL: Record<string, string> = {
  cash: "Cash",
  bank: "Bank",
  mfs: "Mobile wallet",
  card: "Card",
  loan: "Loan",
  receivable: "Receivable",
  payable: "Payable",
};

// A group (an account with sub-accounts, or a top-level one with no kind)
// shows nothing; a leaf shows its kind.
export const accountKindLabel = (template: IAccountTemplate) => {
  if (template.children?.length) return "";
  if (template.accountSubtype) return SUBTYPE_LABEL[template.accountSubtype] ?? humanizeEnum(template.accountSubtype.toUpperCase());
  return template.parentId ? humanizeEnum(template.accountType) : "";
};
