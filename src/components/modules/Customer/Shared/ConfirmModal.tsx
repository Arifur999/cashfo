"use client";

import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  // An English key, translated here.
  confirmLabel?: string;
  isPending?: boolean;
  danger?: boolean;
}

// The customer app's stand-in for window.confirm(): the design's confirm
// dialog, with the labels translated.
export function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel = "Confirm", isPending, danger = true }: ConfirmModalProps) {
  const { t } = useLocale();
  return <ConfirmDialog open={open} onClose={onClose} onConfirm={onConfirm} title={title} description={message} confirmLabel={t(confirmLabel)} danger={danger} isPending={isPending} />;
}
