"use client";

import { useCallback, useRef, useState } from "react";
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
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  // The caller waiting on the open dialog. A second confirm() while one is
  // open answers the first "no" rather than leaving it waiting forever.
  const pending = useRef<((confirmed: boolean) => void) | null>(null);

  const confirm = useCallback(
    (next: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        pending.current?.(false);
        pending.current = resolve;
        setOptions(next);
      }),
    [],
  );

  const settle = (confirmed: boolean) => {
    pending.current?.(confirmed);
    pending.current = null;
    setOptions(null);
  };

  const dialog = (
    <ConfirmModal
      open={options !== null}
      onClose={() => settle(false)}
      onConfirm={() => settle(true)}
      title={t(options?.title ?? "Are you sure?")}
      message={options?.message ?? ""}
      confirmLabel={options?.confirmLabel}
      danger={options?.danger ?? true}
    />
  );

  return { confirm, dialog };
}
