"use client";

import { Download, Trash2, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { resetOwnerDataAction } from "@/app/(dashboardLayout)/admin/manage-owners/_action";
import DownloadOwnerCopyDialog from "@/components/modules/Admin/UserManagement/DownloadOwnerCopyDialog";
import { isPersonalWorkspace } from "@/components/modules/Admin/UserManagement/peopleDisplay";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import T from "@/components/shared/T";
import Button from "@/components/smartly/Button";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural } from "@/lib/i18n/message";
import { queryKeys } from "@/lib/queryKeys";
import type { IOwnerOverviewItem } from "@/types/owner.types";

// What the dialog names and checks: who, the workspace it wipes (their
// default one), and how many other workspaces it leaves alone. A list row
// and a person's page have both.
export type ResetOwnerTarget = Pick<IOwnerOverviewItem, "userId" | "name" | "email" | "workspaceCount" | "businessName"> & Partial<Pick<IOwnerOverviewItem, "businessType">>;

interface ResetOwnerDataDialogProps {
  owner: ResetOwnerTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // MANAGE_ROLES ownerData: the copy offered first (the reset's own rule).
  canDownloadCopy?: boolean;
}

// The AdminOwnerResetDialog board: the one irreversible action on the
// people pages. It names the workspace it wipes, offers a copy of the data
// first, and the admin types the workspace's name to confirm. Every
// account's own workspace is called "Personal", which proves nothing, so
// for that one the admin types the person's email instead.
const ResetOwnerDataDialog = ({ owner, open, onOpenChange, canDownloadCopy = true }: ResetOwnerDataDialogProps) => {
  const { translate, locale } = useLocale();
  const [copying, setCopying] = useState(false);
  const { run, isPending } = useActionMutation({
    action: (userId: string) => resetOwnerDataAction(userId),
    successMessage: "Owner data reset",
    invalidateKeys: [queryKeys.owners.all, queryKeys.workspaces.all],
  });

  // Owners keeps its row after the dialog closes (useRowDialogs), so the
  // words don't change while it fades out.
  if (!owner) return null;
  const others = owner.workspaceCount - 1;
  const personal = isPersonalWorkspace(owner.businessName, owner.businessType);
  const workspace = owner.businessName && !personal ? owner.businessName : translate("{name}'s personal workspace", { name: owner.name });

  return (
    <>
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={TriangleAlert}
      wide
      title={translate("Reset all data in {workspace}?", { workspace })}
      description={
        <>
          <T values={{ workspace: <b className="font-semibold text-ink">{workspace}</b> }}>
            {"This permanently deletes all transactions, accounts, contacts, savings goals, assets, and budget categories for {workspace}. Their account login stays intact."}
          </T>
          {others > 0 && <> {plural(translate, others, "Their other workspace is not touched.", "Their other {count} workspaces are not touched.", undefined, locale)}</>}
        </>
      }
      variant="destructive"
      confirmLabel="Reset / delete all data"
      confirmIcon={Trash2}
      pendingLabel="Resetting..."
      isPending={isPending}
      confirmationText={personal || !owner.businessName ? owner.email : owner.businessName}
      confirmationLabel={translate(personal || !owner.businessName ? "Type their email to confirm:" : "Type the workspace name to confirm:")}
      confirmationMatchedText={personal || !owner.businessName ? "Matches their email" : "Matches the workspace name"}
      footerStart={
        canDownloadCopy && (
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="px-3.5"
            disabled={isPending}
            onClick={() => setCopying(true)}
          >
            <Download className="size-4 text-ink-2" aria-hidden="true" />
            {translate("Download a copy")}
          </Button>
        )
      }
      onConfirm={async () => {
        if (await run(owner.userId)) {
          onOpenChange(false);
        }
      }}
    >
      <p className="flex items-start gap-2.5 rounded-field border border-expense-line bg-expense-soft/50 px-3.5 py-3 text-[13.5px] leading-[normal] font-semibold text-expense">
        <TriangleAlert className="mt-px size-4.25 shrink-0" aria-hidden="true" />
        <T>This can&apos;t be undone. Download a copy first if the owner might want it back.</T>
      </p>
    </ConfirmDialog>
    {canDownloadCopy && <DownloadOwnerCopyDialog owner={owner} open={copying} onOpenChange={setCopying} />}
    </>
  );
};

export default ResetOwnerDataDialog;
