"use client";

import { useCallback, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { ConfirmModal } from "./ConfirmModal";

interface ConfirmOptions {
  // Translated already, like the rest of the caller's text.
  message: string;
  // English keys; ConfirmModal / this hook translate them.
  confirmLabel?: string;
  title?: string;
  danger?: boolean;
}

// The app's own stand-in for window.confirm(), which drops into the browser's
// unstyled alert box (and never speaks Bangla):
//
//   const { confirm, dialog } = useConfirmDialog();
//   if (!(await confirm({ message, confirmLabel: "Remove" }))) return;
//   ...render {dialog} once in the component.
export function useConfirmDialog() {
  const { t } = useLocale();
  const [request, setRequest] = useState<(ConfirmOptions & { resolve: (confirmed: boolean) => void }) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => setRequest({ ...options, resolve })), []);

  const settle = (confirmed: boolean) => {
    request?.resolve(confirmed);
    setRequest(null);
  };

  const dialog = (
    <ConfirmModal
      open={request !== null}
      onClose={() => settle(false)}
      onConfirm={() => settle(true)}
      title={t(request?.title ?? "Are you sure?")}
      message={request?.message ?? ""}
      confirmLabel={request?.confirmLabel}
      danger={request?.danger ?? true}
    />
  );

  return { confirm, dialog };
}
