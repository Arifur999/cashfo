"use client";

import { useQuery } from "@tanstack/react-query";
import { PowerOff, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { deleteCouponAction, turnOffCouponAction } from "@/app/(dashboardLayout)/admin/coupons/_action";
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
import { buildCouponsColumns } from "./couponsColumns";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// A used coupon that still works can be turned off (it can't be deleted).
const canTurnOff = (row: ICoupon) => row.timesRedeemed > 0 && (row.status === "ACTIVE" || row.status === "SCHEDULED");

// Coupons are a short list, so the table sorts, filters and pages in memory.
const CouponsTable = ({ canManage }: { canManage: boolean }) => {
  const { translate } = useLocale();
  const couponsRead = useQuery(couponsQuery());
  const { data: plansResponse } = useQuery(plansQuery());
  const plans = useMemo(() => plansResponse?.data ?? [], [plansResponse]);
  const columns = useMemo(() => buildCouponsColumns(new Map(plans.map((plan) => [plan.id, plan.name]))), [plans]);
  // The row stays while a drawer or dialog closes, so "Edit PUJA15" doesn't
  // go blank (or "Delete PUJA15?" turn into "Delete ?") on its way out.
  const { activeRow: coupon, openDialog, closeDialog, getDialogProps } = useRowDialogs<ICoupon, "redemptions" | "edit" | "turnOff" | "delete">();

  const turnOff = useActionMutation({
    action: turnOffCouponAction,
    successMessage: "Coupon turned off",
    invalidateKeys: [queryKeys.coupons.all],
  });
  const remove = useActionMutation({
    action: deleteCouponAction,
    successMessage: "Coupon deleted",
    invalidateKeys: [queryKeys.coupons.all],
  });

  // "Who used it" sits in the row; editing, turning off and deleting stay
  // behind the menu.
  const actions = useMemo<DataTableActions<ICoupon>>(
    () => ({
      display: "split",
      menuStyle: "action",
      viewLabel: "Who used it",
      onView: (row) => openDialog("redemptions", row),
      onEdit: canManage ? (row) => openDialog("edit", row) : undefined,
      extra: canManage
        ? [
            { label: "Turn off", icon: PowerOff, onClick: (row) => openDialog("turnOff", row), hidden: (row) => !canTurnOff(row) },
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
        data={couponsRead.data?.data}
        columns={columns}
        // An outage is never "No coupons yet": the list says it couldn't
        // load, with Try again.
        isError={couponsRead.isError && !couponsRead.data}
        onRetry={() => void couponsRead.refetch()}
        errorTitle="Couldn't load coupons"
        errorDescription="The server didn't answer. Nothing was changed."
        // The actions column fits "Who used it" and its menu in Bangla too.
        // The board's grid: the code takes what is left, every other column its
        // own px (the actions fit "Who used it" in Bangla too).
        layout={{ gap: 12, rowHeight: 62, headPadding: 12, actionsWidth: 150, flexMinWidth: 140 }}
        getRowId={(row) => row.id}
        isLoading={couponsRead.isLoading}
        isFetching={couponsRead.isFetching}
        // A short list: the board draws it without search or filters.
        hideToolbar
        actions={actions}
        emptyMessage="No coupons yet."
      />

      <CouponRedemptionsDialog coupon={coupon} {...getDialogProps("redemptions")} />

      <FormDrawer centered title={translate("Edit {name}", { name: coupon?.code ?? "" })} width="sm" {...getDialogProps("edit")}>
        {coupon && <CouponForm key={coupon.id} coupon={coupon} defaultValues={toCouponFormValues(coupon)} plans={plans} onDone={closeDialog} />}
      </FormDrawer>

      <ConfirmDialog
        {...getDialogProps("turnOff")}
        title={translate("Turn {code} off?", { code: coupon?.code ?? "" })}
        description="It stops working at checkout. The payments that used it keep it, and you can turn it back on from Edit."
        confirmLabel="Turn off"
        pendingLabel="Saving..."
        isPending={turnOff.isPending}
        onConfirm={async () => {
          if (coupon && (await turnOff.run(coupon.id))) closeDialog();
        }}
      />

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
