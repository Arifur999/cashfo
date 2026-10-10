"use client";

import { useMemo } from "react";
import type { DataTableActions } from "@/components/shared/table/dataTable.types";
import { useRowDialogs } from "./useRowDialogs";

interface UseRowActionModalStateOptions {
  enableView?: boolean;
  enableEdit?: boolean;
  enableDelete?: boolean;
}

// The "which row is being viewed/edited/deleted" state behind every
// management table. `tableActions` goes straight into <DataTable actions>;
// a disabled action is undefined (not a no-op), so its menu item disappears.
export function useRowActionModalState<TData>({
  enableView = true,
  enableEdit = true,
  enableDelete = true,
}: UseRowActionModalStateOptions = {}) {
  const { activeDialog, activeRow, openDialog, getDialogProps } = useRowDialogs<TData, "view" | "edit" | "delete">();

  const tableActions = useMemo<DataTableActions<TData>>(
    () => ({
      onView: enableView ? (row) => openDialog("view", row) : undefined,
      onEdit: enableEdit ? (row) => openDialog("edit", row) : undefined,
      onDelete: enableDelete ? (row) => openDialog("delete", row) : undefined,
    }),
    [enableView, enableEdit, enableDelete, openDialog],
  );

  const viewDialog = getDialogProps("view");
  const editDialog = getDialogProps("edit");
  const deleteDialog = getDialogProps("delete");

  return {
    viewingItem: activeDialog === "view" ? activeRow : null,
    editingItem: activeDialog === "edit" ? activeRow : null,
    deletingItem: activeDialog === "delete" ? activeRow : null,
    isViewDialogOpen: viewDialog.open,
    isEditModalOpen: editDialog.open,
    isDeleteDialogOpen: deleteDialog.open,
    onViewOpenChange: viewDialog.onOpenChange,
    onEditOpenChange: editDialog.onOpenChange,
    onDeleteOpenChange: deleteDialog.onOpenChange,
    tableActions,
  };
}
