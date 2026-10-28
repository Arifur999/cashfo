"use client";

import { Link2 } from "lucide-react";
import Callout from "@/components/shared/Callout";
import CopyButton from "@/components/shared/CopyButton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export interface InviteLink {
  email: string;
  link: string;
}

// While the platform can't send email, an invite's link comes back to the
// super admin who made it, shown once here to pass on themselves.
const InviteLinkDialog = ({ invite, onClose }: { invite: InviteLink | null; onClose: () => void }) => {
  const { translate } = useLocale();
  return (
    <Dialog open={invite !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-lg"
        // Only an explicit "Done" closes it, so a stray click can't lose it.
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="size-4" aria-hidden="true" /> {translate("Invite link")}
          </DialogTitle>
          <DialogDescription>{invite && translate("Email isn't set up, so send this link to {email} yourself.", { email: invite.email })}</DialogDescription>
        </DialogHeader>
        {invite && (
          <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-4 py-3">
            <code className="min-w-0 flex-1 font-mono text-small break-all text-foreground select-all">{invite.link}</code>
            <CopyButton value={invite.link} label="link" />
          </div>
        )}
        <Callout variant="warning">Anyone with this link can join as this admin. It works once and ends in 7 days, and is shown only now.</Callout>
        <DialogFooter>
          <Button onClick={onClose}>{translate("Done")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InviteLinkDialog;
