"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import type { TicketCategory, TicketPriority, UserSearchResult } from "@/lib/api";
import { t } from "@/lib/i18n/t";
import { createTicketAction } from "@/app/admin/(dashboard)/support/_actions";
import { UserSearchSelect } from "./UserSearchSelect";

const CATEGORIES: TicketCategory[] = ["BILLING", "TECHNICAL", "ACCOUNT", "FEATURE_REQUEST", "BUG_REPORT", "OTHER"];
const PRIORITIES: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

interface NewTicketModalProps {
  open: boolean;
  onClose: () => void;
}

export function NewTicketModal({ open, onClose }: NewTicketModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [user, setUser] = useState<UserSearchResult | null>(null);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<TicketCategory>("TECHNICAL");
  const [priority, setPriority] = useState<TicketPriority>("MEDIUM");
  const [initialMessage, setInitialMessage] = useState("");

  function reset() {
    setUser(null);
    setSubject("");
    setCategory("TECHNICAL");
    setPriority("MEDIUM");
    setInitialMessage("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  const isValid = Boolean(user) && subject.trim().length > 0 && initialMessage.trim().length > 0;

  function handleSubmit() {
    if (!user) return;
    startTransition(async () => {
      const result = await createTicketAction({
        platformUserId: user.id,
        subject: subject.trim(),
        category,
        priority,
        initialMessage: initialMessage.trim(),
      });
      if (result.success) {
        toast.success(t("Ticket created."));
        handleClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to create ticket"));
      }
    });
  }

  return (
    <Modal open={open} onClose={handleClose} title={t("New Ticket")}>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">{t("User")}</label>
          <UserSearchSelect value={user} onChange={setUser} />
        </div>

        <div>
          <label htmlFor="ticket-subject" className="mb-1.5 block text-sm font-medium text-neutral-700">
            {t("Subject")}
          </label>
          <input
            id="ticket-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">{t("Category")}</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TicketCategory)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-brand-primary"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">{t("Priority")}</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TicketPriority)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-brand-primary"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="ticket-message" className="mb-1.5 block text-sm font-medium text-neutral-700">
            {t("Initial Message")}
          </label>
          <textarea
            id="ticket-message"
            rows={4}
            value={initialMessage}
            onChange={(e) => setInitialMessage(e.target.value)}
            placeholder={t("Describe the user's issue...")}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
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
            {t("Create Ticket")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
