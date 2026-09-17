"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { resetOwnerDataAction } from "@/app/admin/(dashboard)/manage-owners/_actions";
import { t } from "@/lib/i18n/t";
import { ResetOwnerDataModal } from "./ResetOwnerDataModal";

interface OwnerRowActionsProps {
  userId: string;
  ownerName: string;
  businessName: string;
}

export function OwnerRowActions({ userId, ownerName, businessName }: OwnerRowActionsProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleReset() {
    startTransition(async () => {
      const result = await resetOwnerDataAction(userId);
      if (result.success) {
        toast.success(t("Owner data reset"));
        setIsModalOpen(false);
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to reset owner data"));
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        aria-label={t("Reset / delete all data")}
        title={t("Reset / delete all data")}
        className="rounded-lg p-1.5 text-brand-danger hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <ResetOwnerDataModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        ownerName={ownerName}
        businessName={businessName}
        isSubmitting={isPending}
        onConfirm={handleReset}
      />
    </>
  );
}
