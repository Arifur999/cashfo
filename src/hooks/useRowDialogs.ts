"use client";

import { useCallback, useState } from "react";

// Tracks which dialog is open and for which table row -- at most one at a
// time. Every feature table with row actions (edit, suspend, change plan,
// reset password, ...) names its dialogs and opens them through this.
export function useRowDialogs<TData, TDialog extends string = string>() {
  const [active, setActive] = useState<{ dialog: TDialog; row: TData } | null>(null);

  const openDialog = useCallback((dialog: TDialog, row: TData) => setActive({ dialog, row }), []);
  const closeDialog = useCallback(() => setActive(null), []);

  // Spread straight onto a Dialog: {...getDialogProps("suspend")}.
  const getDialogProps = useCallback(
    (dialog: TDialog) => ({
      open: active?.dialog === dialog,
      onOpenChange: (open: boolean) => {
        if (!open) setActive(null);
      },
    }),
    [active],
  );

  return {
    activeDialog: active?.dialog ?? null,
    activeRow: active?.row ?? null,
    openDialog,
    closeDialog,
    getDialogProps,
  };
}
