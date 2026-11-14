"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { groupTabHref, shiftMonth } from "@/lib/customer/groupDisplay";
import { reopenGroupMonthAction } from "@/lib/customer/groupExpensesActions";
import { monthName } from "@/lib/customer/insights";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { GroupPageData } from "./groupTypes";

// Reopen month (the v16 FamilySettlement board), for the Admin on a closed
// month: its record and the balances it carried go, so its entries can
// change again. A later closed month started from its balances, so that
// one is reopened first (the popup says so and goes there).
export function ReopenMonthButton({ data }: { data: GroupPageData }) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const record = data.closedRecord;
  if (!record) return null;
  const month = monthName(data.range.key, fmt, "long", true);
  const later = data.history.filter((row) => row.periodStart.slice(0, 10) > record.periodEnd.slice(0, 10)).sort((a, b) => b.periodStart.localeCompare(a.periodStart))[0];
  const laterKey = later?.periodStart.slice(0, 7);
  const laterName = laterKey ? monthName(laterKey, fmt, "long", true) : "";

  function reopen() {
    startTransition(async () => {
      const result = await attempt(() => reopenGroupMonthAction(data.businessId, record!.id), t(OFFLINE_MESSAGE), t(STALE_MESSAGE));
      if (!result.success) {
        toast.error(result.message ?? t("Failed to reopen the month"));
        return;
      }
      setOpen(false);
      toast.success(t("{month} is open again", { month }));
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {t("Reopen month")}
      </Button>
      {laterKey ? (
        <ConfirmDialog
          open={open}
          onClose={() => setOpen(false)}
          onConfirm={() => {
            setOpen(false);
            router.push(groupTabHref(data.businessId, "settlement", { month: laterKey }));
          }}
          icon={<Lock />}
          danger={false}
          title={t("Reopen {month} first", { month: laterName })}
          description={t("{later} is closed too and starts from {month}’s balances. Reopen the newest month first, then this one.", { later: laterName, month })}
          confirmLabel={t("Go to {month}", { month: laterName })}
        />
      ) : (
        <ConfirmDialog
          open={open}
          onClose={() => !isPending && setOpen(false)}
          onConfirm={reopen}
          icon={<Lock />}
          danger={false}
          isPending={isPending}
          title={t("Reopen {month}?", { month })}
          description={t("Its entries can be added, changed and deleted again. If anything changes, the balances carried into {next} change too. This is written to the Activity log.", { next: monthName(shiftMonth(data.range.key, 1), fmt, "long", true) })}
          confirmLabel={t("Reopen month")}
        />
      )}
    </>
  );
}
