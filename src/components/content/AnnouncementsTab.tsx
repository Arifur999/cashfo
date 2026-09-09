"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createAnnouncementAction } from "@/app/admin/(dashboard)/content/_actions";
import { Modal } from "@/components/ui/Modal";
import type { AnnouncementRow, AnnouncementType } from "@/lib/api";
import { t } from "@/lib/i18n/t";

const BORDER_COLOR: Record<AnnouncementType, string> = {
  INFO: "border-l-blue-500",
  WARNING: "border-l-orange-500",
  PROMOTION: "border-l-brand-primary",
  MAINTENANCE: "border-l-brand-danger",
};

const STATUS_STYLE: Record<AnnouncementRow["status"], string> = {
  ACTIVE: "bg-green-100 text-green-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
  EXPIRED: "bg-neutral-200 text-neutral-600",
  DISABLED: "bg-red-100 text-red-700",
};

function toDateTimeLocal(date: Date) {
  return date.toISOString().slice(0, 16);
}

export function AnnouncementsTab({ announcements, canManage }: { announcements: AnnouncementRow[]; canManage: boolean }) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<AnnouncementType>("INFO");
  const [startAt, setStartAt] = useState(toDateTimeLocal(new Date()));
  const [endAt, setEndAt] = useState("");
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setTitle("");
    setBody("");
    setType("INFO");
    setStartAt(toDateTimeLocal(new Date()));
    setEndAt("");
  }

  function handleCreate() {
    startTransition(async () => {
      const result = await createAnnouncementAction({
        title,
        body,
        type,
        startAt: new Date(startAt).toISOString(),
        endAt: endAt ? new Date(endAt).toISOString() : undefined,
      });
      if (result.success) {
        toast.success(t("Announcement created"));
        setIsModalOpen(false);
        resetForm();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to create announcement"));
      }
    });
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover"
          >
            <Plus className="h-4 w-4" /> {t("New Announcement")}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {announcements.map((a) => (
          <div key={a.id} className={`rounded-2xl border-l-4 bg-white p-5 shadow-sm shadow-black/5 ${BORDER_COLOR[a.type]}`}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-neutral-900">{a.title}</h3>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[a.status]}`}>{a.status}</span>
            </div>
            <p className="mt-1 text-sm text-neutral-500">{a.body}</p>
            <p className="mt-2 text-xs text-neutral-400">
              {new Date(a.startAt).toLocaleDateString()} {a.endAt && `— ${new Date(a.endAt).toLocaleDateString()}`}
            </p>
          </div>
        ))}
        {announcements.length === 0 && <p className="text-sm text-neutral-400">{t("No announcements yet.")}</p>}
      </div>

      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title={t("New Announcement")}>
        <div className="space-y-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("Title")}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder={t("Body")}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as AnnouncementType)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary"
          >
            <option value="INFO">INFO</option>
            <option value="WARNING">WARNING</option>
            <option value="PROMOTION">PROMOTION</option>
            <option value="MAINTENANCE">MAINTENANCE</option>
          </select>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">{t("Start")}</label>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">{t("End (optional)")}</label>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary"
              />
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100">
            {t("Cancel")}
          </button>
          <button
            type="button"
            disabled={!title || !body || isPending}
            onClick={handleCreate}
            className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
          >
            {t("Create")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
