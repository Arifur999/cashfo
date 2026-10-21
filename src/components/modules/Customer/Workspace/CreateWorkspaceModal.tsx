"use client";

import { CircleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import AppForm from "@/components/shared/form/AppForm";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { createBusinessAction, getBusinessLimitsAction } from "@/lib/customer/businessActions";
import type { BusinessLimits, WorkspaceListItem } from "@/lib/customer/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface CreateWorkspaceModalProps {
  open: boolean;
  onClose: () => void;
  // Optional -- fires with the newly-created workspace right after the
  // success toast, IN ADDITION TO (not instead of) the router.refresh()
  // below. ChooseWorkspaceClient uses it to go straight into the new
  // workspace instead of staying on the chooser.
  onCreated?: (business: WorkspaceListItem) => void;
  // Optional -- the success toast then offers "Open it now", which calls
  // this (Settings › Workspaces switches into it).
  offerOpen?: (business: WorkspaceListItem) => void;
}

// A new business workspace: its name, how to reach it, and an optional PIN.
// Create stays off while the plan has no room for another one.
export function CreateWorkspaceModal({ open, onClose, onCreated, offerOpen }: CreateWorkspaceModalProps) {
  const router = useRouter();
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [limits, setLimits] = useState<BusinessLimits | null>(null);
  const [limitsLoading, setLimitsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Reset the form the instant the modal transitions closed -> open (React's
  // documented render-time pattern for "reset state when a prop changes",
  // rather than a useEffect that would cause an extra render pass).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setName("");
      setPhone("");
      setEmail("");
      setPin("");
      setLimitsLoading(true);
    }
  }

  // The actual network fetch IS a legitimate effect (an external system
  // call, not derivable state) -- fetched fresh every time the modal opens
  // so Create can be proactively disabled instead of letting the user
  // submit and find out via a failed POST.
  useEffect(() => {
    if (!open) return;
    getBusinessLimitsAction()
      .then(setLimits)
      .finally(() => setLimitsLoading(false));
  }, [open]);

  const atLimit = limits?.atLimit ?? false;
  const pinValid = pin.length === 0 || /^\d{4,6}$/.test(pin);
  const isValid = name.trim().length > 0 && !atLimit && pinValid;

  function handleSubmit() {
    if (!isValid || isPending || limitsLoading) return;
    startTransition(async () => {
      const result = await createBusinessAction({
        name,
        currency: "BDT",
        phone: phone || undefined,
        email: email || undefined,
        pin: pin || undefined,
      });
      if (result.success) {
        const created = result.data;
        toast.success(t("Workspace created"), created && offerOpen ? { action: { label: t("Open it now"), onClick: () => offerOpen(created) } } : undefined);
        onClose();
        router.refresh();
        if (created) onCreated?.(created);
      } else {
        toast.error(result.message ?? t("Failed to create workspace"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <DialogContent showCloseButton={false} aria-describedby={undefined} className="w-110 max-w-[calc(100vw-32px)] gap-0 rounded-lg border border-line bg-surface p-6 text-ink shadow-overlay ring-0">
        <AppForm onSubmit={handleSubmit} className="flex flex-col gap-5 space-y-0">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-h3 text-ink">{t("New Business Workspace")}</DialogTitle>
            <button type="button" onClick={onClose} disabled={isPending} aria-label={t("Close")} className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken disabled:opacity-50">
              <X className="size-4.5" aria-hidden="true" />
            </button>
          </div>

          {!limitsLoading && atLimit && (
            <p role="alert" className="flex gap-2 rounded-md bg-expense-soft px-4 py-3 text-small text-expense">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {limits && limits.maxBusinessWorkspaces === 0
                ? t("Your current plan does not include business workspaces. Upgrade to add one.")
                : `${t("Your plan allows up to")} ${limits?.maxBusinessWorkspaces} ${t("business workspace(s). Upgrade to add more.")}`}
            </p>
          )}

          <div className="flex flex-col gap-4">
            <Field htmlFor="new-workspace-name" label={t("Name")}>
              <Input id="new-workspace-name" size="md" value={name} onChange={(e) => setName(e.target.value)} disabled={atLimit} placeholder={t("e.g. My Shop")} autoComplete="organization" />
            </Field>
            <Field htmlFor="new-workspace-phone" label={t("Phone")}>
              <Input id="new-workspace-phone" size="md" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={atLimit} placeholder="e.g. 01XXXXXXXXX" autoComplete="tel" />
            </Field>
            <Field htmlFor="new-workspace-email" label={t("Email")}>
              <Input id="new-workspace-email" size="md" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={atLimit} placeholder="e.g. name@example.com" autoComplete="email" />
            </Field>
            <Field htmlFor="new-workspace-pin" label={t("PIN")} hint={t("Optional -- set a PIN to require it when switching into this workspace.")}>
              <Input
                id="new-workspace-pin"
                size="md"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ""))}
                disabled={atLimit}
                placeholder={t("4-6 digits")}
                autoComplete="off"
                aria-describedby="new-workspace-pin-hint"
              />
            </Field>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={!isValid || isPending || limitsLoading}>
              {isPending && <Loader size={16} onDark label={t("Loading...")} />}
              {t("Create")}
            </Button>
          </div>
        </AppForm>
      </DialogContent>
    </Dialog>
  );
}
