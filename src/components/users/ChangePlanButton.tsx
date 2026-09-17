"use client";

import { ArrowLeftRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { changeOwnerPlanAction } from "@/app/admin/(dashboard)/users/_actions";
import type { OwnerOverviewItem, SubscriptionPlanOption } from "@/lib/api";
import { t } from "@/lib/i18n/t";

const MIN_REASON_LENGTH = 5;

interface ChangePlanButtonProps {
  owner: Pick<OwnerOverviewItem, "userId" | "planId" | "planName">;
  plans: SubscriptionPlanOption[];
}

export function ChangePlanButton({ owner, plans }: ChangePlanButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [newPlanId, setNewPlanId] = useState(owner.planId ?? "");
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const isValid = newPlanId && newPlanId !== owner.planId && reason.trim().length >= MIN_REASON_LENGTH;

  function handleClose() {
    setOpen(false);
    setNewPlanId(owner.planId ?? "");
    setReason("");
  }

  function handleConfirm() {
    if (!isValid) return;
    startTransition(async () => {
      const result = await changeOwnerPlanAction(owner.userId, newPlanId, reason.trim());
      if (result.success) {
        toast.success(t("Plan changed"));
        handleClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to change plan"));
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
      >
        <ArrowLeftRight className="h-4 w-4" /> {t("Change Plan")}
      </button>

      <Modal open={open} onClose={handleClose} title={t("Change Plan")}>
        <p className="mb-4 text-sm text-neutral-500">
          {t("Current plan")}: <span className="font-medium text-neutral-800">{owner.planName ?? t("None")}</span>
        </p>

        <label className="mb-1.5 block text-sm font-medium text-neutral-700">{t("New Plan")}</label>
        <select
          value={newPlanId}
          onChange={(e) => setNewPlanId(e.target.value)}
          className="mb-4 w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary"
        >
          <option value="" disabled>
            {t("Select a plan...")}
          </option>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
        </select>

        <label htmlFor="change-plan-reason" className="mb-1.5 block text-sm font-medium text-neutral-700">
          {t("Reason")}
        </label>
        <textarea
          id="change-plan-reason"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("Explain why (minimum 5 characters)")}
          className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
        />

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
          >
            {t("Cancel")}
          </button>
          <button
            type="button"
            disabled={!isValid || isPending}
            onClick={handleConfirm}
            className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("Confirm Change")}
          </button>
        </div>
      </Modal>
    </>
  );
}
