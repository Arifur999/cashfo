"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { getBusinessDetailAction, updateBusinessAction } from "@/lib/businessActions";
import type { UserBusiness } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface EditWorkspaceModalProps {
  business: UserBusiness | null;
  onClose: () => void;
}

export function EditWorkspaceModal({ business, onClose }: EditWorkspaceModalProps) {
  const router = useRouter();
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
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

  function handleSubmit() {
    if (!business) return;
    startTransition(async () => {
      const result = await updateBusinessAction(business.id, {
        name,
        phone: phone || undefined,
        email: email || undefined,
        pin: pin || undefined,
      });
      if (result.success) {
        toast.success(t("Workspace updated"));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to update workspace"));
      }
    });
  }

  const pinValid = pin.length === 0 || /^\d{4,6}$/.test(pin);
  const isValid = name.trim().length > 0 && pinValid;

  return (
    <Modal open={business !== null} onClose={onClose} title={t("Edit Workspace")}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Name")}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Phone")}</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={loading}
            placeholder="e.g. 01XXXXXXXXX"
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 disabled:bg-neutral-50"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Email")}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            placeholder="e.g. name@example.com"
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 disabled:bg-neutral-50"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Change PIN")}</label>
          <p className="mb-1 text-xs text-neutral-500">{t("Leave blank to keep the current PIN unchanged.")}</p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ""))}
            disabled={loading}
            placeholder={t("4-6 digits")}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 disabled:bg-neutral-50"
          />
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100">
          {t("Cancel")}
        </button>
        <button
          type="button"
          disabled={!isValid || isPending || loading}
          onClick={handleSubmit}
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("Save Changes")}
        </button>
      </div>
    </Modal>
  );
}
