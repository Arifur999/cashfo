"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { KeyRound, MoreVertical, Pencil, ShieldOff } from "lucide-react";
import { useClickOutside } from "@/hooks/useClickOutside";
import type { FullAdminUser } from "@/lib/api";
import { t } from "@/lib/i18n/t";
import { resetAdminPasswordAction, suspendAdminAction } from "@/app/admin/(dashboard)/security/_actions";
import { ResetPasswordModal } from "@/components/users/ResetPasswordModal";
import { EditAdminModal } from "./EditAdminModal";

type ActiveModal = "edit" | "reset-password" | null;

interface AdminActionsMenuProps {
  admin: FullAdminUser;
  isSelf: boolean;
}

export function AdminActionsMenu({ admin, isSelf }: AdminActionsMenuProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => setIsMenuOpen(false));

  function handleSuspend() {
    startTransition(async () => {
      const result = await suspendAdminAction(admin.id);
      if (result.success) {
        toast.success(t("Admin suspended."));
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to suspend admin"));
      }
    });
  }

  function handleResetPassword() {
    startTransition(async () => {
      const result = await resetAdminPasswordAction(admin.id);
      if (result.success && result.data) {
        setTempPassword(result.data.temporaryPassword);
        setActiveModal("reset-password");
        toast.success(t("Temporary password generated"));
      } else {
        toast.error(result.message ?? t("Failed to reset password"));
      }
    });
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsMenuOpen((v) => !v)}
          aria-label={t("Actions")}
          className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {isMenuOpen && (
          <div className="absolute right-0 z-10 mt-1 w-52 overflow-hidden rounded-xl border border-neutral-100 bg-white py-1 shadow-lg">
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                setActiveModal("edit");
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
            >
              <Pencil className="h-4 w-4" /> {t("Edit")}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setIsMenuOpen(false);
                handleResetPassword();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              <KeyRound className="h-4 w-4" /> {t("Reset Password")}
            </button>
            <button
              type="button"
              disabled={isSelf || isPending}
              title={isSelf ? t("You cannot suspend your own account.") : undefined}
              onClick={() => {
                setIsMenuOpen(false);
                handleSuspend();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-brand-danger hover:bg-red-50 disabled:cursor-not-allowed disabled:text-neutral-300 disabled:hover:bg-transparent"
            >
              <ShieldOff className="h-4 w-4" /> {t("Suspend")}
            </button>
          </div>
        )}
      </div>

      <EditAdminModal open={activeModal === "edit"} onClose={() => setActiveModal(null)} admin={admin} isSelf={isSelf} />
      <ResetPasswordModal
        open={activeModal === "reset-password"}
        onClose={() => {
          setActiveModal(null);
          setTempPassword(null);
        }}
        tempPassword={tempPassword}
      />
    </>
  );
}
