"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { createBusinessAction, getBusinessLimitsAction } from "@/lib/businessActions";
import type { BusinessLimits, WorkspaceListItem } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";

const CURRENCIES = ["BDT"];

interface CreateWorkspaceModalProps {
  open: boolean;
  onClose: () => void;
  // Optional -- fires with the newly-created workspace right after the
  // success toast, IN ADDITION TO (not instead of) the router.refresh()
  // below. Callers that don't need it (the default WorkspaceSwitcher flow)
  // just omit it; ChooseWorkspaceClient uses it to navigate straight into
  // the new workspace instead of refreshing the current page.
  onCreated?: (business: WorkspaceListItem) => void;
}

export function CreateWorkspaceModal({ open, onClose, onCreated }: CreateWorkspaceModalProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("BDT");
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
      setCurrency("BDT");
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

  function handleSubmit() {
    startTransition(async () => {
      const result = await createBusinessAction({
        name,
        currency,
        phone: phone || undefined,
        email: email || undefined,
        pin: pin || undefined,
      });
      if (result.success) {
        toast.success("Workspace created");
        onClose();
        router.refresh();
        if (result.data) onCreated?.(result.data);
      } else {
        toast.error(result.message ?? "Failed to create workspace");
      }
    });
  }

  const atLimit = limits?.atLimit ?? false;
  const pinValid = pin.length === 0 || /^\d{4,6}$/.test(pin);
  const isValid = name.trim().length > 0 && !atLimit && pinValid;

  return (
    <Modal open={open} onClose={onClose} title="New Business Workspace">
      <div className="space-y-4">
        {!limitsLoading && atLimit && (
          <p className="rounded-xl bg-brand-danger/10 px-3.5 py-2.5 text-sm text-brand-danger">
            {limits && limits.maxBusinessWorkspaces === 0
              ? "Your current plan does not include business workspaces. Upgrade to add one."
              : `Your plan allows up to ${limits?.maxBusinessWorkspaces} business workspace(s). Upgrade to add more.`}
          </p>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={atLimit}
            placeholder="e.g. My Shop"
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 disabled:bg-neutral-50 disabled:text-neutral-400"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            disabled={atLimit}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary disabled:bg-neutral-50 disabled:text-neutral-400"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={atLimit}
            placeholder="e.g. 01XXXXXXXXX"
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 disabled:bg-neutral-50 disabled:text-neutral-400"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={atLimit}
            placeholder="e.g. name@example.com"
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 disabled:bg-neutral-50 disabled:text-neutral-400"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">PIN</label>
          <p className="mb-1 text-xs text-neutral-500">Optional -- set a PIN to require it when switching into this workspace.</p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ""))}
            disabled={atLimit}
            placeholder="4-6 digits"
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 disabled:bg-neutral-50 disabled:text-neutral-400"
          />
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100">
          Cancel
        </button>
        <button
          type="button"
          disabled={!isValid || isPending || limitsLoading}
          onClick={handleSubmit}
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Create
        </button>
      </div>
    </Modal>
  );
}
