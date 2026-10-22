"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import AppForm from "@/components/shared/form/AppForm";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getBusinessDetailAction, updateBusinessAction } from "@/lib/customer/businessActions";
import type { UserBusiness } from "@/lib/customer/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface EditWorkspaceModalProps {
  business: UserBusiness | null;
  onClose: () => void;
}

// A workspace's name, phone, email and PIN lock. The PIN is never shown:
// blank keeps it, a new one replaces it, the box removes it.
export function EditWorkspaceModal({ business, onClose }: EditWorkspaceModalProps) {
  const router = useRouter();
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [removePin, setRemovePin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Reset the form the instant a different workspace (or none) is passed in
  // -- render-time state adjustment (React's documented pattern), not an
  // effect, since it's synchronously derivable from the new prop.
  const [prevBusinessId, setPrevBusinessId] = useState(business?.id ?? null);
  if ((business?.id ?? null) !== prevBusinessId) {
    setPrevBusinessId(business?.id ?? null);
    if (business) {
      setName(business.name);
      // Never prefilled -- the backend never returns the actual PIN, only
      // hasPinLock. Leaving this blank, combined with sending `pin: undefined`
      // for an untouched field below, is what gives "leave blank to keep the
      // current PIN unchanged" its meaning.
      setPin("");
      setRemovePin(false);
      setLoading(true);
    }
  }

  // phone/email aren't in `business` (UserBusiness, from /api/auth/me, omits
  // them) -- fetching them IS a legitimate effect (an external system call).
  useEffect(() => {
    if (!business) return;
    getBusinessDetailAction(business.id).then((result) => {
      if (result.success && result.data) {
        setPhone(result.data.phone ?? "");
        setEmail(result.data.email ?? "");
      }
      setLoading(false);
    });
  }, [business]);

  const pinValid = removePin || pin.length === 0 || /^\d{4,6}$/.test(pin);
  const isValid = name.trim().length > 0 && pinValid;

  function handleSubmit() {
    if (!business || !isValid || isPending || loading) return;
    startTransition(async () => {
      const result = await updateBusinessAction(business.id, {
        name,
        phone: phone || undefined,
        email: email || undefined,
        // null removes the lock; blank keeps it as it is.
        pin: removePin ? null : pin || undefined,
      });
      if (result.success) {
        toast.success(t("Workspace updated"));
        onClose();
        router.refresh();
      } else {
        // The API's own refusal (or the action's fallback) is English;
        // its Bangla is in settings-workspace.ts.
        toast.error(t(result.message ?? "Failed to update workspace"));
      }
    });
  }

  return (
    <Dialog open={business !== null} onOpenChange={(next) => !next && !isPending && onClose()}>
      <DialogContent showCloseButton={false} aria-describedby={undefined} className="w-110 max-w-[calc(100vw-32px)] gap-0 rounded-lg border border-line bg-surface p-6 text-ink shadow-overlay ring-0">
        <AppForm onSubmit={handleSubmit} className="flex flex-col gap-5 space-y-0">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-h3 text-ink">{t("Edit Workspace")}</DialogTitle>
            <button type="button" onClick={onClose} disabled={isPending} aria-label={t("Close")} className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken disabled:opacity-50">
              <X className="size-4.5" aria-hidden="true" />
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <Field htmlFor="edit-workspace-name" label={t("Name")}>
              <Input id="edit-workspace-name" size="md" value={name} onChange={(e) => setName(e.target.value)} autoComplete="organization" />
            </Field>
            <Field htmlFor="edit-workspace-phone" label={t("Phone")}>
              <Input id="edit-workspace-phone" size="md" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={loading} placeholder="e.g. 01XXXXXXXXX" autoComplete="tel" />
            </Field>
            <Field htmlFor="edit-workspace-email" label={t("Email")}>
              <Input id="edit-workspace-email" size="md" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} placeholder="e.g. name@example.com" autoComplete="email" />
            </Field>
            <Field
              htmlFor="edit-workspace-pin"
              label={business?.hasPinLock ? t("Change PIN") : t("Set a PIN")}
              hint={business?.hasPinLock ? t("Leave blank to keep the current PIN unchanged.") : t("Asked before this workspace opens on any device. Leave blank for no PIN.")}
            >
              <Input
                id="edit-workspace-pin"
                size="md"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ""))}
                disabled={loading || removePin}
                placeholder={t("4-6 digits")}
                autoComplete="off"
                aria-describedby="edit-workspace-pin-hint"
              />
            </Field>
            {business?.hasPinLock && (
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-body text-ink-2">
                <input
                  type="checkbox"
                  checked={removePin}
                  onChange={(e) => {
                    setRemovePin(e.target.checked);
                    setPin("");
                  }}
                  className="size-4.5 shrink-0 cursor-pointer rounded-sm accent-emerald"
                />
                {t("Remove the PIN")}
              </label>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={!isValid || isPending || loading}>
              {isPending && <Loader size={16} onDark label={t("Loading...")} />}
              {t("Save Changes")}
            </Button>
          </div>
        </AppForm>
      </DialogContent>
    </Dialog>
  );
}
