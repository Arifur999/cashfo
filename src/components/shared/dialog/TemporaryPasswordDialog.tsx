"use client";

import { KeyRound } from "lucide-react";
import Callout from "@/components/shared/Callout";
import CopyButton from "@/components/shared/CopyButton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface TemporaryPasswordDialogProps {
  // The password to reveal; null keeps the dialog closed.
  password: string | null;
  // Whose password it is, e.g. "Rina Akter".
  accountName?: string;
  onClose: () => void;
}

// Shows a generated password exactly once -- the API keeps only its hash,
// so closing this is the last chance to see it.
const TemporaryPasswordDialog = ({ password, accountName, onClose }: TemporaryPasswordDialogProps) => {
  const { translate } = useLocale();
  return (
    <Dialog open={password !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-md"
        // Only an explicit "Done" closes it, so a stray click can't lose it.
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-4" aria-hidden="true" /> {translate("Temporary password")}
          </DialogTitle>
          <DialogDescription>
            {accountName ? translate("For {name}.").replace("{name}", accountName) : translate("For the new account.")}{" "}
            {translate("They sign in with it once, then choose their own.")}
          </DialogDescription>
        </DialogHeader>
        {password && (
          <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-4 py-3">
            <code className="min-w-0 flex-1 font-mono text-base break-all text-foreground select-all">{password}</code>
            <CopyButton value={password} label="password" />
          </div>
        )}
        <Callout variant="warning">Shown once and not stored anywhere readable. Share it over a secure channel.</Callout>
        <DialogFooter>
          <Button onClick={onClose}>{translate("Done")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TemporaryPasswordDialog;
