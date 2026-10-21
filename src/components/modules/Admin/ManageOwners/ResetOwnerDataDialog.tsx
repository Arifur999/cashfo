"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { resetOwnerDataAction } from "@/app/(dashboardLayout)/admin/manage-owners/_action";
import { countPhrase } from "@/components/modules/Admin/UserManagement/peopleDisplay";
import Callout from "@/components/shared/Callout";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import T from "@/components/shared/T";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { queryKeys } from "@/lib/queryKeys";
import type { IOwnerOverviewItem } from "@/types/owner.types";

// What the dialog names and checks: who, their email to type, and how many
// other workspaces it leaves alone. A list row and a person's page have both.
export type ResetOwnerTarget = Pick<IOwnerOverviewItem, "userId" | "name" | "email" | "workspaceCount">;

interface ResetOwnerDataDialogProps {
  owner: ResetOwnerTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// The one irreversible action on the people pages. The backend wipes the
// person's personal (default) workspace only -- every account's is called
// "Personal", so the dialog names the person, not the workspace, and the
// admin types their email, which no one else has, to confirm.
const ResetOwnerDataDialog = ({ owner, open, onOpenChange }: ResetOwnerDataDialogProps) => {
  const { translate, locale } = useLocale();
  // Owners clears its row the moment the dialog closes; the last person
  // stays on screen while it fades out, so the words don't change mid-fade.
  const [last, setLast] = useState(owner);
  if (owner && owner !== last) setLast(owner);
  const shown = owner ?? last;
  const { run, isPending } = useActionMutation({
    action: (userId: string) => resetOwnerDataAction(userId),
    successMessage: "Owner data reset",
    invalidateKeys: [queryKeys.owners.all, queryKeys.workspaces.all],
  });

  if (!shown) return null;
  const others = shown.workspaceCount - 1;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={translate("Reset {name}'s personal workspace?", { name: shown.name })}
      description={
        <>
          {/* Everything the backend deletes, and what it puts back. */}
          <T values={{ name: <b className="font-semibold text-ink">{shown.name}</b>, email: shown.email }}>
            {
              "This permanently deletes every account, transaction, contact, savings goal, asset, asset type, budget category, income goal and the monthly budget in {name}'s ({email}) personal workspace, then puts back the starting accounts. Their login and password vault stay as they are."
            }
          </T>
          {others > 0 && <> {countPhrase(translate, locale, others, "Their other workspace is not touched.", "Their other {count} workspaces are not touched.")}</>}
        </>
      }
      variant="destructive"
      confirmLabel="Reset / delete all data"
      confirmIcon={Trash2}
      pendingLabel="Resetting..."
      isPending={isPending}
      // Irreversible, so their email (unique, where the workspace name is
      // "Personal" for everyone) must be typed out first.
      confirmationText={shown.email}
      confirmationLabel={translate("Type their email to confirm:")}
      confirmationMatchedText="Matches their email"
      onConfirm={async () => {
        if (await run(shown.userId)) {
          onOpenChange(false);
        }
      }}
    >
      <Callout variant="danger" className="font-semibold">
        <T>This can&apos;t be undone.</T>
      </Callout>
    </ConfirmDialog>
  );
};

export default ResetOwnerDataDialog;
