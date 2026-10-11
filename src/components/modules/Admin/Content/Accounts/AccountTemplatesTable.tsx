"use client";

import { useQuery } from "@tanstack/react-query";
import { CirclePlus, PowerOff, RotateCcw } from "lucide-react";
import { useMemo } from "react";
import { reactivateAccountTemplateAction } from "@/app/(dashboardLayout)/admin/content/_action";
import type { DataTableActions } from "@/components/shared/table/dataTable.types";
import DataTable from "@/components/shared/table/DataTable";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useRowDialogs } from "@/hooks/useRowDialogs";
import { queryKeys } from "@/lib/queryKeys";
import { accountTemplatesQuery } from "@/queries/accountTemplate.queries";
import type { IAccountTemplate } from "@/types/accountTemplate.types";
import AccountTemplateDialogs, { type AccountTemplateDialog } from "./AccountTemplateDialogs";
import { ACCOUNT_TEMPLATE_FILTERS } from "./accountTemplateOptions";
import { ACCOUNT_TEMPLATES_HIDDEN_COLUMNS, accountTemplatesColumns } from "./accountTemplatesColumns";
import CreateAccountTemplateDialog from "./CreateAccountTemplateDialog";

const getChildren = (row: IAccountTemplate) => row.children;

// The default chart of accounts as a tree: top-level accounts expand into
// their sub-accounts, and search / filters keep a parent whose child matches.
const AccountTemplatesTable = ({ canManage }: { canManage: boolean }) => {
  const { data, isLoading, isFetching } = useQuery(accountTemplatesQuery());
  const { activeDialog, activeRow, openDialog, closeDialog } = useRowDialogs<IAccountTemplate, AccountTemplateDialog>();

  const reactivate = useActionMutation({
    action: reactivateAccountTemplateAction,
    successMessage: "Account reactivated",
    invalidateKeys: [queryKeys.accountTemplates.all],
    refreshRoute: false,
  });

  const actions = useMemo<DataTableActions<IAccountTemplate> | undefined>(
    () =>
      canManage
        ? {
            onEdit: (row) => openDialog("edit", row),
            extra: [
              {
                label: "Add sub-account",
                icon: CirclePlus,
                onClick: (row) => openDialog("addChild", row),
                // The chart is one level deep.
                hidden: (row) => row.parentId !== null || !row.isActive,
              },
              { label: "Reactivate", icon: RotateCcw, onClick: (row) => void reactivate.run(row.id), hidden: (row) => row.isActive },
              {
                label: "Deactivate",
                icon: PowerOff,
                destructive: true,
                onClick: (row) => openDialog("deactivate", row),
                hidden: (row) => !row.isActive,
              },
            ],
          }
        : undefined,
    [canManage, openDialog, reactivate],
  );

  return (
    <>
      <DataTable
        data={data?.data}
        columns={accountTemplatesColumns}
        getRowId={(row) => row.id}
        getSubRows={getChildren}
        tableId="account-templates"
        defaultHiddenColumns={ACCOUNT_TEMPLATES_HIDDEN_COLUMNS}
        initialPageSize={25}
        isLoading={isLoading}
        isFetching={isFetching}
        search={{ placeholder: "Search accounts..." }}
        filters={{ configs: ACCOUNT_TEMPLATE_FILTERS }}
        exportFileName="chart-of-accounts"
        actions={actions}
        toolbarAction={canManage ? <CreateAccountTemplateDialog /> : undefined}
        emptyMessage="No default accounts yet."
      />
      <AccountTemplateDialogs template={activeRow} activeDialog={activeDialog} onClose={closeDialog} />
    </>
  );
};

export default AccountTemplatesTable;
