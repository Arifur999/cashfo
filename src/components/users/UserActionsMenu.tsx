"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Eye, MoreVertical, ShieldOff, UserCheck } from "lucide-react";
import { activateOwnerAction, suspendOwnerAction } from "@/app/admin/(dashboard)/users/_actions";
import type { OwnerOverviewItem } from "@/lib/api";
import { t } from "@/lib/i18n/t";
import { useClickOutside } from "@/hooks/useClickOutside";
import { ReasonModal } from "./ReasonModal";

interface UserActionsMenuProps {
  owner: Pick<OwnerOverviewItem, "userId" | "status">;
  variant?: "dropdown" | "buttons";
}

export function UserActionsMenu({ owner, variant = "dropdown" }: UserActionsMenuProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => setIsMenuOpen(false));

  function handleSuspend(reason: string) {
    startTransition(async () => {
      const result = await suspendOwnerAction(owner.userId, reason);
      if (result.success) {
        toast.success(t("Owner suspended"));
        setIsSuspendModalOpen(false);
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to suspend owner"));
      }
    });
  }

  function handleActivate() {
    startTransition(async () => {
      const result = await activateOwnerAction(owner.userId);
      if (result.success) {
        toast.success(t("Owner activated"));
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to activate owner"));
      }
    });
  }

  const actions = (
    <>
      <Link
        href={`/admin/users/${owner.userId}`}
        className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
      >
        <Eye className="h-4 w-4" /> {t("View")}
      </Link>
      {owner.status === "SUSPENDED" ? (
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
            setIsSuspendModalOpen(true);
          }}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
        >
          <ShieldOff className="h-4 w-4" /> {t("Suspend")}
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
          {owner.status === "SUSPENDED" ? (
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
              onClick={() => setIsSuspendModalOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <ShieldOff className="h-4 w-4" /> {t("Suspend")}
            </button>
          )}
        </div>
      )}

      <ReasonModal
        open={isSuspendModalOpen}
        onClose={() => setIsSuspendModalOpen(false)}
        title={t("Suspend Owner")}
        warning={t("This immediately blocks the owner from logging in or using their account until reactivated.")}
        confirmLabel={t("Suspend")}
        isSubmitting={isPending}
        onConfirm={handleSuspend}
      />
    </>
  );
}
