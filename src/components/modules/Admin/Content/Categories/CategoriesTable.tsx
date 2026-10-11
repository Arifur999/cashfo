"use client";

import { useQuery } from "@tanstack/react-query";
import { PowerOff, RotateCcw } from "lucide-react";
import { useMemo } from "react";
import { setCategoryActiveAction } from "@/app/(dashboardLayout)/admin/content/categories/_action";
import FormDialog from "@/components/shared/dialog/FormDialog";
import type { DataTableActions } from "@/components/shared/table/dataTable.types";
import DataTable from "@/components/shared/table/DataTable";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useRowDialogs } from "@/hooks/useRowDialogs";
import { queryKeys } from "@/lib/queryKeys";
import { categoriesQuery } from "@/queries/category.queries";
import type { ICategory } from "@/types/category.types";
import { CATEGORIES_HIDDEN_COLUMNS, categoriesColumns } from "./categoriesColumns";
import { toCategoryFormValues } from "./categoryForm.defaults";
import CategoryForm from "./CategoryForm";
import { CATEGORY_FILTERS } from "./categoryOptions";
import CreateCategoryDialog from "./CreateCategoryDialog";

// A short list, so the table searches, filters and sorts in memory.
const CategoriesTable = ({ canManage }: { canManage: boolean }) => {
  const { data, isLoading, isFetching } = useQuery(categoriesQuery());
  const { activeRow: category, openDialog, closeDialog, getDialogProps } = useRowDialogs<ICategory, "edit">();

  const { run: setActive } = useActionMutation({
    action: ({ id, isActive }: { id: string; isActive: boolean }) => setCategoryActiveAction(id, isActive),
    successMessage: (updated) => `${updated.name} ${updated.isActive ? "activated" : "deactivated"}`,
    invalidateKeys: [queryKeys.categories.all],
    refreshRoute: false,
  });

  const actions = useMemo<DataTableActions<ICategory> | undefined>(
    () =>
      canManage
        ? {
            onEdit: (row) => openDialog("edit", row),
            extra: [
              {
                label: "Activate",
                icon: RotateCcw,
                onClick: (row) => void setActive({ id: row.id, isActive: true }),
                hidden: (row) => row.isActive,
              },
              {
                label: "Deactivate",
                icon: PowerOff,
                destructive: true,
                onClick: (row) => void setActive({ id: row.id, isActive: false }),
                hidden: (row) => !row.isActive,
              },
            ],
          }
        : undefined,
    [canManage, openDialog, setActive],
  );

  return (
    <>
      <DataTable
        data={data?.data}
        columns={categoriesColumns}
        getRowId={(row) => row.id}
        tableId="categories"
        defaultHiddenColumns={CATEGORIES_HIDDEN_COLUMNS}
        initialPageSize={25}
        isLoading={isLoading}
        isFetching={isFetching}
        search={{ placeholder: "Search categories..." }}
        filters={{ configs: CATEGORY_FILTERS }}
        exportFileName="categories"
        actions={actions}
        toolbarAction={canManage ? <CreateCategoryDialog /> : undefined}
        emptyMessage="No default categories yet."
      />
      <FormDialog title="Edit category" description={category?.name} {...getDialogProps("edit")}>
        {category && <CategoryForm category={category} defaultValues={toCategoryFormValues(category)} onDone={closeDialog} />}
      </FormDialog>
    </>
  );
};

export default CategoriesTable;
