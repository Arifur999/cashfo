"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { PinCard } from "./PinCard";

interface PinPromptModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  businessName: string;
  isOwner: boolean;
  onVerified: () => void;
  // Where the focus goes once the dialog closes (useReturnFocus). Opened
  // from state, it has no trigger of its own to give the focus back to.
  onCloseAutoFocus?: (event: Event) => void;
}

// The PIN dialog a locked workspace asks through before it opens: over the
// workspace chooser, and from every switcher (useWorkspaceSwitch).
export function PinPromptModal({ open, onClose, businessId, businessName, isOwner, onVerified, onCloseAutoFocus }: PinPromptModalProps) {
  const { t } = useLocale();

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        onCloseAutoFocus={onCloseAutoFocus}
        className="w-110 max-w-[calc(100vw-32px)] gap-0 rounded-lg border border-line bg-surface p-6 text-ink shadow-overlay ring-0"
      >
        <DialogTitle className="sr-only">{t("Enter the PIN for {name}", { name: businessName })}</DialogTitle>
        <PinCard
          businessId={businessId}
          businessName={businessName}
          isOwner={isOwner}
          onOpened={() => {
            onVerified();
            onClose();
          }}
          cancelLabel={t("Cancel")}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
