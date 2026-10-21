import { type IAccountTemplate, TEMPLATE_WORKSPACE_TYPES } from "@/types/accountTemplate.types";
import type { IAccountTemplateFormValues } from "@/zod/accountTemplate.validation";
import { NO_SUBTYPE } from "./accountTemplateOptions";

type TemplateWorkspaceType = (typeof TEMPLATE_WORKSPACE_TYPES)[number];

const isTemplateWorkspaceType = (value: string): value is TemplateWorkspaceType =>
  (TEMPLATE_WORKSPACE_TYPES as readonly string[]).includes(value);

// A sub-account inherits its parent's type and workspaces, and goes last.
export const getNewAccountTemplateDefaults = (parent?: IAccountTemplate): IAccountTemplateFormValues => ({
  name: "",
  nameBn: "",
  accountType: parent?.accountType ?? "EXPENSE",
  accountSubtype: NO_SUBTYPE,
  appliesTo: parent ? parent.appliesTo.filter(isTemplateWorkspaceType) : [...TEMPLATE_WORKSPACE_TYPES],
  displayOrder: String(parent?.children?.length ?? 0),
});

export const toAccountTemplateFormValues = (template: IAccountTemplate): IAccountTemplateFormValues => ({
  name: template.name,
  nameBn: template.nameBn,
  accountType: template.accountType,
  accountSubtype: template.accountSubtype || NO_SUBTYPE,
  appliesTo: template.appliesTo.filter(isTemplateWorkspaceType),
  displayOrder: String(template.displayOrder),
});

// What is saved: the picker's "no subtype" is no subtype at all.
export const toAccountTemplateSubmitValues = (values: IAccountTemplateFormValues): IAccountTemplateFormValues => ({
  ...values,
  accountSubtype: values.accountSubtype === NO_SUBTYPE ? "" : values.accountSubtype,
});
