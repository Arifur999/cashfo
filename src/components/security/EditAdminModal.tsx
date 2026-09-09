"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import type { AdminRole, FullAdminUser } from "@/lib/api";
import { t } from "@/lib/i18n/t";
import { updateAdminAction } from "@/app/admin/(dashboard)/security/_actions";

const ROLES: AdminRole[] = ["SUPER_ADMIN", "SUPPORT_ADMIN", "FINANCE_ADMIN", "CONTENT_ADMIN"];

interface EditAdminModalProps {
  open: boolean;
  onClose: () => void;
  admin: FullAdminUser;
  isSelf: boolean;
}

export function EditAdminModal({ open, onClose, admin, isSelf }: EditAdminModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(admin.name);
  const [role, setRole] = useState<AdminRole>(admin.role);

  useEffect(() => {
    if (open) {
      setName(admin.name);
      setRole(admin.role);
    }
  }, [open, admin]);

  const isValid = name.trim().length > 0;

  function handleSubmit() {
    startTransition(async () => {
      const updates: { name?: string; role?: AdminRole } = {};
      if (name.trim() !== admin.name) updates.name = name.trim();
      if (!isSelf && role !== admin.role) updates.role = role;

      const result = await updateAdminAction(admin.id, updates);
      if (result.success) {
        toast.success(t("Admin updated."));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to update admin"));
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={t("Edit Admin")}>
      <div className="space-y-4">
        <div>
          <label htmlFor="edit-admin-name" className="mb-1.5 block text-sm font-medium text-neutral-700">
            {t("Name")}
          </label>
          <input
            id="edit-admin-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">{t("Role")}</label>
          <select
            value={role}
            disabled={isSelf}
            onChange={(e) => setRole(e.target.value as AdminRole)}
            title={isSelf ? t("You cannot change your own role.") : undefined}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-brand-primary disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          {isSelf && <p className="mt-1 text-xs text-neutral-400">{t("You cannot change your own role.")}</p>}
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
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
            {t("Save")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
