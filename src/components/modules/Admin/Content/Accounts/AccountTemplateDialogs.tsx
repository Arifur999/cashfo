"use client";

import { deactivateAccountTemplateAction } from "@/app/(dashboardLayout)/admin/content/_action";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import FormDialog from "@/components/shared/dialog/FormDialog";
import { useActionMutation } from "@/hooks/useActionMutation";
import { queryKeys } from "@/lib/queryKeys";
import type { IAccountTemplate } from "@/types/accountTemplate.types";
import { getNewAccountTemplateDefaults, toAccountTemplateFormValues } from "./accountTemplateForm.defaults";
import AccountTemplateForm from "./AccountTemplateForm";

export type AccountTemplateDialog = "edit" | "addChild" | "deactivate";

interface AccountTemplateDialogsProps {
  template: IAccountTemplate | null;
  activeDialog: AccountTemplateDialog | null;
  onClose: () => void;
}

// Every row-level account dialog in one place.
const AccountTemplateDialogs = ({ template, activeDialog, onClose }: AccountTemplateDialogsProps) => {
  const deactivate = useActionMutation({
    action: deactivateAccountTemplateAction,
    successMessage: "Account deactivated",
    invalidateKeys: [queryKeys.accountTemplates.all],
    refreshRoute: false,
  });

  const dialogProps = (dialog: AccountTemplateDialog) => ({
    open: activeDialog === dialog && template !== null,
    onOpenChange: (open: boolean) => {
      if (!open) onClose();
    },
  });

  return (
    <>
      <FormDialog title="Edit account" description={template?.name} {...dialogProps("edit")}>
        {template && <AccountTemplateForm template={template} defaultValues={toAccountTemplateFormValues(template)} onDone={onClose} />}
      </FormDialog>

      <FormDialog title="Add sub-account" description={template ? `Under ${template.name}` : undefined} {...dialogProps("addChild")}>
        {template && <AccountTemplateForm parent={template} defaultValues={getNewAccountTemplateDefaults(template)} onDone={onClose} />}
      </FormDialog>

      <ConfirmDialog
        {...dialogProps("deactivate")}
        title="Deactivate account"
        description={`New workspaces will no longer get "${template?.name}". Workspaces that already have it keep it.`}
        variant="destructive"
        confirmLabel="Deactivate"
        pendingLabel="Deactivating..."
        isPending={deactivate.isPending}
        onConfirm={async () => {
          if (template && (await deactivate.run(template.id))) onClose();
        }}
      />
    </>
  );
};

export default AccountTemplateDialogs;
