"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { getBusinessDetailAction, updateBusinessAction } from "@/lib/businessActions";
import type { UserBusiness } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";

const CURRENCIES = ["BDT", "USD"];

interface EditWorkspaceModalProps {
  business: UserBusiness | null;
  onClose: () => void;
}

export function EditWorkspaceModal({ business, onClose }: EditWorkspaceModalProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("BDT");
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
      setLoading(true);
    }
  }

  // The currency isn't in `business` (UserBusiness, from /api/auth/me, omits
  // it) -- fetching it IS a legitimate effect (an external system call).
  useEffect(() => {
    if (!business) return;
    getBusinessDetailAction(business.id).then((result) => {
      if (result.success && result.data) {
        setCurrency(result.data.currency);
      }
      setLoading(false);
    });
  }, [business]);

  function handleSubmit() {
    if (!business) return;
    startTransition(async () => {
      const result = await updateBusinessAction(business.id, { name, currency });
      if (result.success) {
        toast.success("Workspace updated");
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? "Failed to update workspace");
      }
    });
  }

  const isValid = name.trim().length > 0;

  return (
    <Modal open={business !== null} onClose={onClose} title="Edit Workspace">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            disabled={loading}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary disabled:bg-neutral-50"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100">
          Cancel
        </button>
        <button
          type="button"
          disabled={!isValid || isPending || loading}
          onClick={handleSubmit}
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Changes
        </button>
      </div>
    </Modal>
  );
}
