"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import type { NotificationChannel, NotificationTemplateRow, PlatformUserStatus, SubscriptionPlanOption } from "@/lib/api";
import { t } from "@/lib/i18n/t";
import { createCampaignAction } from "@/app/admin/(dashboard)/notifications/_actions";

const CHANNELS: NotificationChannel[] = ["EMAIL", "SMS", "IN_APP_PUSH"];
const STATUSES: PlatformUserStatus[] = ["ACTIVE", "SUSPENDED", "BANNED", "PENDING_DELETION"];

interface NewCampaignModalProps {
  open: boolean;
  onClose: () => void;
  templates: NotificationTemplateRow[];
  planOptions: SubscriptionPlanOption[];
}

export function NewCampaignModal({ open, onClose, templates, planOptions }: NewCampaignModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [templateKey, setTemplateKey] = useState(templates[0]?.key ?? "");
  const [channel, setChannel] = useState<NotificationChannel>(templates[0]?.channel ?? "EMAIL");
  const [planId, setPlanId] = useState("");
  const [status, setStatus] = useState<PlatformUserStatus | "">("");
  const [scheduledFor, setScheduledFor] = useState("");

  function reset() {
    setTitle("");
    setTemplateKey(templates[0]?.key ?? "");
    setChannel(templates[0]?.channel ?? "EMAIL");
    setPlanId("");
    setStatus("");
    setScheduledFor("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  const isValid = title.trim().length > 0 && templateKey.length > 0;

  function handleSubmit() {
    startTransition(async () => {
      const result = await createCampaignAction({
        title: title.trim(),
        templateKey,
        channel,
        targetFilter: {
          ...(planId && { planId }),
          ...(status && { status }),
        },
        ...(scheduledFor && { scheduledFor: new Date(scheduledFor).toISOString() }),
      });
      if (result.success) {
        toast.success(t("Campaign created."));
        handleClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to create campaign"));
      }
    });
  }

  return (
    <Modal open={open} onClose={handleClose} title={t("New Campaign")}>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">{t("Title")}</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">{t("Template")}</label>
            <select
              value={templateKey}
              onChange={(e) => {
                setTemplateKey(e.target.value);
                const tpl = templates.find((tp) => tp.key === e.target.value);
                if (tpl) setChannel(tpl.channel);
              }}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-brand-primary"
            >
              {templates.map((tpl) => (
                <option key={tpl.key} value={tpl.key}>
                  {tpl.key}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">{t("Channel")}</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as NotificationChannel)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-brand-primary"
            >
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {c.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-neutral-700">{t("Target audience")}</p>
          <div className="grid grid-cols-2 gap-3">
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-brand-primary"
            >
              <option value="">{t("Plan = Any")}</option>
              {planOptions.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {t("Plan")} = {plan.name}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PlatformUserStatus | "")}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-brand-primary"
            >
              <option value="">{t("Status = Any")}</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t("Status")} = {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">{t("Schedule for (optional)")}</label>
          <input
            type="datetime-local"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div className="flex justify-end gap-3 pt-1">
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
            onClick={handleSubmit}
            className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("Create Campaign")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
