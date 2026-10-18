"use client";

import { KeyRound } from "lucide-react";
import { useState } from "react";
import { resetOwnerPasswordAction } from "@/app/(dashboardLayout)/admin/users/_action";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import TemporaryPasswordDialog from "@/components/shared/dialog/TemporaryPasswordDialog";
import Button from "@/components/smartly/Button";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { IOwnerRef } from "@/types/owner.types";
import T from "@/components/shared/T";

// The user page's Reset password: after a confirm, a one-time password to
// hand over, shown once. The person is signed out everywhere.
const ResetOwnerPasswordButton = ({ owner, className }: { owner: IOwnerRef; className?: string }) => {
  const { translate } = useLocale();
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const { run, isPending } = useActionMutation({
    action: () => resetOwnerPasswordAction(owner.userId),
    successMessage: "Password reset",
    refreshRoute: false,
    onSuccess: ({ temporaryPassword }) => setPassword(temporaryPassword),
  });

  return (
    <>
      <Button variant="secondary" className={className} onClick={() => setConfirming(true)}>
        <KeyRound className="size-3.75 text-ink-2" aria-hidden="true" />
        <T>Reset password</T>
      </Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={translate("Reset {name}'s password?", { name: owner.name })}
        description={translate("They're signed out on every device and sign in again with a temporary password you give them. You'll see it once.")}
        confirmLabel="Reset password"
        pendingLabel="Resetting..."
        isPending={isPending}
        onConfirm={async () => {
          if (await run(undefined)) setConfirming(false);
        }}
      />
      <TemporaryPasswordDialog password={password} accountName={owner.name} onClose={() => setPassword(null)} />
    </>
  );
};

export default ResetOwnerPasswordButton;
