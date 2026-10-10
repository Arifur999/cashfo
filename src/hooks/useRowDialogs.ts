"use client";

import { useCallback, useState } from "react";

// Tracks which dialog is open and for which table row -- at most one at a
// time. Feature tables with custom row actions (suspend, change plan, reset
// password, ...) use this directly; useRowActionModalState builds the
// standard view/edit/delete trio on top of it.
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
