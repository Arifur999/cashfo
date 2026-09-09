"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import type { AdminRole } from "@/lib/api";
import { t } from "@/lib/i18n/t";
import { createAdminAction } from "@/app/admin/(dashboard)/security/_actions";
import { ResetPasswordModal } from "@/components/users/ResetPasswordModal";

const ROLES: AdminRole[] = ["SUPER_ADMIN", "SUPPORT_ADMIN", "FINANCE_ADMIN", "CONTENT_ADMIN"];

interface NewAdminModalProps {
  open: boolean;
  onClose: () => void;
}

export function NewAdminModal({ open, onClose }: NewAdminModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("SUPPORT_ADMIN");
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);

  function reset() {
    setName("");
    setEmail("");
    setRole("SUPPORT_ADMIN");
  }

  function handleClose() {
    reset();
    onClose();
  }

  const isValid = name.trim().length > 0 && /\S+@\S+\.\S+/.test(email);

  function handleSubmit() {
    startTransition(async () => {
      const result = await createAdminAction({ name: name.trim(), email: email.trim(), role });
      if (result.success && result.data) {
        toast.success(t("Admin account created."));
        setTemporaryPassword(result.data.temporaryPassword);
        reset();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to create admin"));
      }
    });
  }

  if (temporaryPassword) {
    return (
      <ResetPasswordModal
        open={open}
        onClose={() => {
          setTemporaryPassword(null);
          onClose();
        }}
        tempPassword={temporaryPassword}
      />
    );
  }

  return (
    <Modal open={open} onClose={handleClose} title={t("New Admin")}>
      <div className="space-y-4">
        <div>
          <label htmlFor="admin-name" className="mb-1.5 block text-sm font-medium text-neutral-700">
            {t("Name")}
          </label>
          <input
            id="admin-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div>
          <label htmlFor="admin-email" className="mb-1.5 block text-sm font-medium text-neutral-700">
            {t("Email")}
          </label>
          <input
            id="admin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">{t("Role")}</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as AdminRole)}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-brand-primary"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replaceAll("_", " ")}
              </option>
            ))}
          </select>
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
            {t("Create Admin")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
