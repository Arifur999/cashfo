"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import type { BillingCycle, FeatureLimits, SubscriptionPlan } from "@/lib/api";
import { t } from "@/lib/i18n/t";
import { FeatureLimitsFields } from "./FeatureLimitsFields";

const DEFAULT_FEATURE_LIMITS: FeatureLimits = {
  maxWorkspaces: 1,
  maxBusinessWorkspaces: 0,
  maxTransactionsPerMonth: 50,
  advancedReports: false,
  pdfExport: false,
  multiUser: false,
  incomeGoalTracking: false,
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export interface PlanFormValues {
  name: string;
  slug: string;
  billingCycle: BillingCycle;
  price: number;
  trialDays: number;
  featureLimits: FeatureLimits;
  isActive?: boolean;
}

interface PlanFormModalProps {
  open: boolean;
  onClose: () => void;
  editingPlan: SubscriptionPlan | null;
  isSubmitting: boolean;
  onSubmit: (values: PlanFormValues) => void;
}

export function PlanFormModal({ open, onClose, editingPlan, isSubmitting, onSubmit }: PlanFormModalProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("MONTHLY");
  const [price, setPrice] = useState(0);
  const [trialDays, setTrialDays] = useState(0);
  const [featureLimits, setFeatureLimits] = useState<FeatureLimits>(DEFAULT_FEATURE_LIMITS);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    if (editingPlan) {
      setName(editingPlan.name);
      setSlug(editingPlan.slug);
      setSlugTouched(true);
      setBillingCycle(editingPlan.billingCycle);
      setPrice(Number(editingPlan.price));
      setTrialDays(editingPlan.trialDays);
      setFeatureLimits(editingPlan.featureLimits);
      setIsActive(editingPlan.isActive);
    } else {
      setName("");
      setSlug("");
      setSlugTouched(false);
      setBillingCycle("MONTHLY");
      setPrice(0);
      setTrialDays(0);
      setFeatureLimits(DEFAULT_FEATURE_LIMITS);
      setIsActive(true);
    }
  }, [open, editingPlan]);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  const isValid = name.trim().length > 0 && slug.trim().length > 0;

  return (
    <Modal open={open} onClose={onClose} title={editingPlan ? t("Edit Plan") : t("Create Plan")}>
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Name")}</label>
            <input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Slug")}</label>
            <input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Billing Cycle")}</label>
            <select
              value={billingCycle}
              onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary"
            >
              <option value="FREE">FREE</option>
              <option value="MONTHLY">MONTHLY</option>
              <option value="YEARLY">YEARLY</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Price (BDT)")}</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Trial Days")}</label>
            <input
              type="number"
              value={trialDays}
              onChange={(e) => setTrialDays(Number(e.target.value))}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-neutral-700">{t("Feature Limits")}</p>
          <FeatureLimitsFields value={featureLimits} onChange={setFeatureLimits} />
        </div>

        {editingPlan && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 accent-brand-primary"
            />
            {t("Active (unchecking archives this plan)")}
          </label>
        )}
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
        >
          {t("Cancel")}
        </button>
        <button
          type="button"
          disabled={!isValid || isSubmitting}
          onClick={() => onSubmit({ name, slug, billingCycle, price, trialDays, featureLimits, isActive: editingPlan ? isActive : undefined })}
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {editingPlan ? t("Save Changes") : t("Create Plan")}
        </button>
      </div>
    </Modal>
  );
}
