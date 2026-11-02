"use client";

import { useState } from "react";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { IOwnerRef } from "@/types/owner.types";
import { downloadOwnerCopy } from "./ownerCopy";
import { isSupportCode, SupportCodeField } from "./SupportCodeField";

interface DownloadOwnerCopyDialogProps {
  owner: Pick<IOwnerRef, "userId" | "name"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Download a copy: the customer's own data export, and like View as
// customer only with the support code they made (it is used up).
const DownloadOwnerCopyDialog = ({ owner, open, onOpenChange }: DownloadOwnerCopyDialogProps) => {
  const { translate } = useLocale();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const ready = isSupportCode(code);

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        // Every opening starts with an empty code.
        if (!next) setCode("");
        onOpenChange(next);
      }}
      title="Download a copy"
      description={
        <T values={{ name: owner?.name ?? <T>this owner</T> }}>
          {"A zip of everything {name} keeps in Smartly, except their saved passwords. It needs their support code, and it is recorded in the audit log."}
        </T>
      }
      confirmLabel="Download"
      pendingLabel="Preparing..."
      isPending={busy}
      confirmDisabled={!ready}
      onConfirm={async () => {
        if (!owner || !ready) return;
        setBusy(true);
        const saved = await downloadOwnerCopy(owner.userId, code, translate);
        setBusy(false);
        if (saved) {
          setCode("");
          onOpenChange(false);
        }
      }}
    >
      <SupportCodeField value={code} onChange={setCode} />
    </ConfirmDialog>
  );
};

export default DownloadOwnerCopyDialog;
