"use client";

import { useCallback, useState } from "react";

// Tracks which dialog is open and for which table row -- at most one at a
// time. Every feature table with row actions (edit, suspend, change plan,
// reset password, ...) names its dialogs and opens them through this. The
// row stays after its dialog closes, until another one opens, so a dialog
// keeps its words while it animates away ("Delete PUJA15?" never turns into
// "Delete ?", "Edit Monthly Pro" into "New plan").
export function useRowDialogs<TData, TDialog extends string = string>() {
  const [active, setActive] = useState<{ dialog: TDialog | null; row: TData } | null>(null);

  const openDialog = useCallback((dialog: TDialog, row: TData) => setActive({ dialog, row }), []);
  const closeDialog = useCallback(() => setActive((current) => (current && current.dialog !== null ? { ...current, dialog: null } : current)), []);

  // Spread straight onto a Dialog: {...getDialogProps("suspend")}.
  const getDialogProps = useCallback(
    (dialog: TDialog) => ({
      open: active?.dialog === dialog,
      onOpenChange: (open: boolean) => {
        if (!open) closeDialog();
      },
    }),
    [active, closeDialog],
  );

  return {
    activeDialog: active?.dialog ?? null,
    // The row the last dialog was opened for, open or closing; null until one opens.
    activeRow: active?.row ?? null,
    openDialog,
    closeDialog,
    getDialogProps,
  };
}
