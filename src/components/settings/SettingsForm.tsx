"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";
import type { PlatformSettings } from "@/lib/api";
import { t } from "@/lib/i18n/t";
import { updateSettingsAction } from "@/app/admin/(dashboard)/settings/_actions";

interface SettingsFormProps {
  initial: PlatformSettings;
  canManage: boolean;
}

export function SettingsForm({ initial, canManage }: SettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [platformName, setPlatformName] = useState(initial.platformName);
  const [supportEmail, setSupportEmail] = useState(initial.supportEmail);
  const [defaultCurrency, setDefaultCurrency] = useState(initial.defaultCurrency);
  const [defaultTimezone, setDefaultTimezone] = useState(initial.defaultTimezone);
  const [maintenanceMode, setMaintenanceMode] = useState(initial.maintenanceMode);
  const [maintenanceMessage, setMaintenanceMessage] = useState(initial.maintenanceMessage);

  const isValid = platformName.trim().length > 0 && /\S+@\S+\.\S+/.test(supportEmail) && defaultCurrency.trim().length > 0 && defaultTimezone.trim().length > 0;

  function handleSave() {
    startTransition(async () => {
      const result = await updateSettingsAction({
        platformName: platformName.trim(),
        supportEmail: supportEmail.trim(),
        defaultCurrency: defaultCurrency.trim(),
        defaultTimezone: defaultTimezone.trim(),
        maintenanceMode,
        maintenanceMessage: maintenanceMessage.trim(),
      });
      if (result.success) {
        toast.success(t("Settings saved."));
      } else {
        toast.error(result.message ?? t("Failed to update settings"));
      }
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm shadow-black/5">
        <h2 className="mb-4 text-sm font-semibold text-neutral-900">{t("General")}</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">{t("Platform Name")}</label>
            <input
              value={platformName}
              disabled={!canManage}
              onChange={(e) => setPlatformName(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 disabled:bg-neutral-50 disabled:text-neutral-400"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">{t("Support Email")}</label>
            <input
              type="email"
              value={supportEmail}
              disabled={!canManage}
              onChange={(e) => setSupportEmail(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 disabled:bg-neutral-50 disabled:text-neutral-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">{t("Default Currency")}</label>
              <input
                value={defaultCurrency}
                disabled={!canManage}
                onChange={(e) => setDefaultCurrency(e.target.value)}
                placeholder="BDT"
                className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 disabled:bg-neutral-50 disabled:text-neutral-400"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">{t("Default Timezone")}</label>
              <input
                value={defaultTimezone}
                disabled={!canManage}
                onChange={(e) => setDefaultTimezone(e.target.value)}
                placeholder="Asia/Dhaka"
                className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 disabled:bg-neutral-50 disabled:text-neutral-400"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm shadow-black/5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">{t("Maintenance Mode")}</h2>
            <p className="mt-0.5 text-sm text-neutral-500">
              {t("When enabled, the future end-user app should show the message below instead of normal access.")}
            </p>
          </div>
          <ToggleSwitch checked={maintenanceMode} disabled={!canManage} onChange={() => setMaintenanceMode((v) => !v)} />
        </div>

        {maintenanceMode && (
          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">{t("Maintenance Message")}</label>
            <textarea
              rows={3}
              value={maintenanceMessage}
              disabled={!canManage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 disabled:bg-neutral-50 disabled:text-neutral-400"
            />
          </div>
        )}
      </div>

      {canManage && (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={!isValid || isPending}
            onClick={handleSave}
            className="flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("Save Changes")}
          </button>
        </div>
      )}
    </div>
  );
}
