"use client";

import { useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useMemo } from "react";
import { deleteCouponAction } from "@/app/(dashboardLayout)/admin/coupons/_action";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import FormDrawer from "@/components/shared/dialog/FormDrawer";
import type { DataTableActions } from "@/components/shared/table/dataTable.types";
import DataTable from "@/components/shared/table/DataTable";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useRowDialogs } from "@/hooks/useRowDialogs";
import { queryKeys } from "@/lib/queryKeys";
import { couponsQuery } from "@/queries/coupon.queries";
import { plansQuery } from "@/queries/plan.queries";
import type { ICoupon } from "@/types/coupon.types";
import { toCouponFormValues } from "./couponForm.defaults";
import CouponForm from "./CouponForm";
import CouponRedemptionsDialog from "./CouponRedemptionsDialog";
import { buildCouponsColumns, COUPON_FILTERS } from "./couponsColumns";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// Coupons are a short list, so the table sorts, filters and pages in memory.
const CouponsTable = ({ canManage }: { canManage: boolean }) => {
  const { translate } = useLocale();
  const { data: couponsResponse, isLoading, isFetching } = useQuery(couponsQuery());
  const { data: plansResponse } = useQuery(plansQuery());
  const plans = useMemo(() => plansResponse?.data ?? [], [plansResponse]);
  const columns = useMemo(() => buildCouponsColumns(new Map(plans.map((plan) => [plan.id, plan.name]))), [plans]);
  const { activeRow: coupon, openDialog, closeDialog, getDialogProps } = useRowDialogs<ICoupon, "redemptions" | "edit" | "delete">();

  const remove = useActionMutation({
    action: deleteCouponAction,
    successMessage: "Coupon deleted",
    invalidateKeys: [queryKeys.coupons.all],
  });

  // "Who used it" sits in the row; editing and deleting stay behind the menu.
  const actions = useMemo<DataTableActions<ICoupon>>(
    () => ({
      display: "split",
      viewLabel: "Who used it",
      onView: (row) => openDialog("redemptions", row),
      onEdit: canManage ? (row) => openDialog("edit", row) : undefined,
      extra: canManage
        ? [
            {
              label: "Delete",
              icon: Trash2,
              destructive: true,
              onClick: (row) => openDialog("delete", row),
              // A redeemed coupon is part of payment history and can't go.
              hidden: (row) => row.timesRedeemed > 0,
            },
          ]
        : [],
    }),
    [canManage, openDialog],
  );

  return (
    <>
      <DataTable
        data={couponsResponse?.data}
        columns={columns}
        getRowId={(row) => row.id}
        tableId="coupons"
        isLoading={isLoading}
        isFetching={isFetching}
        search={{ placeholder: "Search by code" }}
        filters={{ configs: COUPON_FILTERS }}
        exportFileName="coupons"
        actions={actions}
        emptyMessage="No coupons yet."
      />

      <CouponRedemptionsDialog coupon={coupon} {...getDialogProps("redemptions")} />

      <FormDrawer title={translate("Edit {name}", { name: coupon?.code ?? "" })} width="sm" {...getDialogProps("edit")}>
        {coupon && <CouponForm coupon={coupon} defaultValues={toCouponFormValues(coupon)} plans={plans} onDone={closeDialog} />}
      </FormDrawer>

      <ConfirmDialog
        {...getDialogProps("delete")}
        title={translate("Delete {name}?", { name: coupon?.code ?? "" })}
        description="Nobody has used it, so it can go. This can't be undone."
        variant="destructive"
        confirmLabel="Delete coupon"
        pendingLabel="Deleting..."
        isPending={remove.isPending}
        onConfirm={async () => {
          if (coupon && (await remove.run(coupon.id))) closeDialog();
        }}
      />
    </>
  );
};

export default CouponsTable;
