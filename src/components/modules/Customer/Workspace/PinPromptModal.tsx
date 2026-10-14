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
}

// The PIN dialog over the workspace chooser.
export function PinPromptModal({ open, onClose, businessId, businessName, isOwner, onVerified }: PinPromptModalProps) {
  const { t } = useLocale();

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent showCloseButton={false} className="w-110 max-w-[calc(100vw-32px)] gap-0 rounded-lg border border-line bg-surface p-6 shadow-overlay">
        <DialogTitle className="sr-only">{`${t("Enter the PIN for")} ${businessName}`}</DialogTitle>
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
