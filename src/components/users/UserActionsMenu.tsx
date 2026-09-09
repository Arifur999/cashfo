"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Ban, Eye, KeyRound, MoreVertical, ShieldOff, UserCheck, UserX } from "lucide-react";
import {
  activateUserAction,
  banUserAction,
  impersonateUserAction,
  resetPasswordAction,
  suspendUserAction,
} from "@/app/admin/(dashboard)/users/_actions";
import type { PlatformUser } from "@/lib/api";
import { t } from "@/lib/i18n/t";
import { useClickOutside } from "@/hooks/useClickOutside";
import { ReasonModal } from "./ReasonModal";
import { ResetPasswordModal } from "./ResetPasswordModal";

interface UserActionsMenuProps {
  user: Pick<PlatformUser, "id" | "status">;
  isSuperAdmin: boolean;
  variant?: "dropdown" | "buttons";
}

type ActiveModal = "suspend" | "ban" | "reset-password" | null;

export function UserActionsMenu({ user, isSuperAdmin, variant = "dropdown" }: UserActionsMenuProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => setIsMenuOpen(false));

  function handleSuspend(reason: string) {
    startTransition(async () => {
      const result = await suspendUserAction(user.id, reason);
      if (result.success) {
        toast.success(t("User suspended"));
        setActiveModal(null);
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to suspend user"));
      }
    });
  }

  function handleActivate() {
    startTransition(async () => {
      const result = await activateUserAction(user.id);
      if (result.success) {
        toast.success(t("User activated"));
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to activate user"));
      }
    });
  }

  function handleBan(reason: string) {
    startTransition(async () => {
      const result = await banUserAction(user.id, reason);
      if (result.success) {
        toast.success(t("User banned"));
        setActiveModal(null);
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to ban user"));
      }
    });
  }

  function handleResetPassword() {
    startTransition(async () => {
      const result = await resetPasswordAction(user.id);
      if (result.success && result.data) {
        setTempPassword(result.data.tempPassword);
        setActiveModal("reset-password");
        toast.success(t("Temporary password generated"));
      } else {
        toast.error(result.message ?? t("Failed to reset password"));
      }
    });
  }

  function handleImpersonate() {
    startTransition(async () => {
      const result = await impersonateUserAction(user.id);
      if (result.success) {
        toast.success(t("Impersonation token generated (logged in Activity Log)"));
      } else {
        toast.error(result.message ?? t("Failed to start impersonation"));
      }
    });
  }

  const actions = (
    <>
      <Link
        href={`/admin/users/${user.id}`}
        className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
      >
        <Eye className="h-4 w-4" /> {t("View")}
      </Link>
      {user.status === "SUSPENDED" ? (
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setIsMenuOpen(false);
            handleActivate();
          }}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          <UserCheck className="h-4 w-4" /> {t("Activate")}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            setIsMenuOpen(false);
            setActiveModal("suspend");
          }}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
        >
          <ShieldOff className="h-4 w-4" /> {t("Suspend")}
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          setIsMenuOpen(false);
          setActiveModal("ban");
        }}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-brand-danger hover:bg-red-50"
      >
        <Ban className="h-4 w-4" /> {t("Ban")}
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
      {isSuperAdmin && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setIsMenuOpen(false);
            handleImpersonate();
          }}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          <UserX className="h-4 w-4" /> {t("Impersonate")}
        </button>
      )}
    </>
  );

  return (
    <>
      {variant === "dropdown" ? (
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
            <div className="absolute right-0 z-10 mt-1 w-48 overflow-hidden rounded-xl border border-neutral-100 bg-white py-1 shadow-lg">
              {actions}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {user.status === "SUSPENDED" ? (
            <button
              type="button"
              disabled={isPending}
              onClick={handleActivate}
              className="flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              <UserCheck className="h-4 w-4" /> {t("Activate")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveModal("suspend")}
              className="flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <ShieldOff className="h-4 w-4" /> {t("Suspend")}
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveModal("ban")}
            className="flex items-center gap-2 rounded-xl bg-brand-danger px-4 py-2 text-sm font-medium text-white hover:bg-brand-danger-hover"
          >
            <Ban className="h-4 w-4" /> {t("Ban")}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleResetPassword}
            className="flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            <KeyRound className="h-4 w-4" /> {t("Reset Password")}
          </button>
          {isSuperAdmin && (
            <button
              type="button"
              disabled={isPending}
              onClick={handleImpersonate}
              className="flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              <UserX className="h-4 w-4" /> {t("Impersonate")}
            </button>
          )}
        </div>
      )}

      <ReasonModal
        open={activeModal === "suspend"}
        onClose={() => setActiveModal(null)}
        title={t("Suspend User")}
        warning={t("This will immediately block the user from accessing their account until reactivated.")}
        confirmLabel={t("Suspend")}
        isSubmitting={isPending}
        onConfirm={handleSuspend}
      />
      <ReasonModal
        open={activeModal === "ban"}
        onClose={() => setActiveModal(null)}
        title={t("Ban User")}
        warning={t("Banning is more severe than suspending and implies a permanent block.")}
        confirmLabel={t("Ban")}
        isSubmitting={isPending}
        onConfirm={handleBan}
      />
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
