"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createBusinessAction } from "@/lib/businessActions";
import type { WorkspaceListItem } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface CreateGroupWorkspaceModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (workspace: WorkspaceListItem) => void;
}

// Deliberately much simpler than CreateWorkspaceModal (the BUSINESS-type
// one) -- no phone/email/PIN/plan-limits check, since a GROUP workspace is
// free and unlimited (see BusinessesService.create()). Just a name.
export function CreateGroupWorkspaceModal({ open, onClose, onCreated }: CreateGroupWorkspaceModalProps) {
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setName("");
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await createBusinessAction({ name, currency: "BDT", type: "GROUP" });
      if (result.success && result.data) {
        toast.success(t("Group workspace created"));
        onClose();
        onCreated(result.data);
      } else {
        toast.error(result.message ?? t("Failed to create group workspace"));
      }
    });
  }

  const isValid = name.trim().length > 0;

  return (
    <Modal open={open} onClose={onClose} title={t("New Group / Mess Workspace")}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Name")}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            placeholder={t("e.g. আমাদের মেস, বাসা ৩২")}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
          <p className="mt-1 text-xs text-neutral-400">
            {t("Members you add here don't need their own login -- you record contributions and expenses on their behalf.")}
          </p>
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100">
          {t("Cancel")}
        </button>
        <button
          type="button"
          disabled={!isValid || isPending}
          onClick={handleSubmit}
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("Create")}
        </button>
      </div>
    </Modal>
  );
}
