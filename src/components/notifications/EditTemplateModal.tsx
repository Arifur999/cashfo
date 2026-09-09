"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import type { NotificationTemplateRow } from "@/lib/api";
import { t } from "@/lib/i18n/t";
import { updateTemplateAction } from "@/app/admin/(dashboard)/notifications/_actions";

interface EditTemplateModalProps {
  open: boolean;
  onClose: () => void;
  template: NotificationTemplateRow;
}

export function EditTemplateModal({ open, onClose, template }: EditTemplateModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [subjectEn, setSubjectEn] = useState(template.subjectEn ?? "");
  const [subjectBn, setSubjectBn] = useState(template.subjectBn ?? "");
  const [bodyEn, setBodyEn] = useState(template.bodyEn);
  const [bodyBn, setBodyBn] = useState(template.bodyBn);

  useEffect(() => {
    if (open) {
      setSubjectEn(template.subjectEn ?? "");
      setSubjectBn(template.subjectBn ?? "");
      setBodyEn(template.bodyEn);
      setBodyBn(template.bodyBn);
    }
  }, [open, template]);

  function handleSubmit() {
    startTransition(async () => {
      const result = await updateTemplateAction(template.id, {
        ...(template.subjectEn !== null && { subjectEn }),
        ...(template.subjectBn !== null && { subjectBn }),
        bodyEn,
        bodyBn,
      });
      if (result.success) {
        toast.success(t("Template saved."));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to update template"));
      }
    });
  }

  const hasSubject = template.subjectEn !== null || template.subjectBn !== null;

  return (
    <Modal open={open} onClose={onClose} title={`${t("Edit Template")}: ${template.key}`}>
      <div className="space-y-4">
        {template.variables.length > 0 && (
          <div>
            <p className="mb-1.5 text-sm font-medium text-neutral-700">{t("Available variables")}</p>
            <div className="flex flex-wrap gap-1.5">
              {template.variables.map((v) => (
                <span key={v} className="rounded-full bg-neutral-100 px-2.5 py-1 font-mono text-xs text-neutral-600">
                  {`{{${v}}}`}
                </span>
              ))}
            </div>
          </div>
        )}

        {hasSubject && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">{t("Subject (English)")}</label>
              <input
                value={subjectEn}
                onChange={(e) => setSubjectEn(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">{t("Subject (বাংলা)")}</label>
              <input
                value={subjectBn}
                onChange={(e) => setSubjectBn(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">{t("Body (English)")}</label>
            <textarea
              rows={5}
              value={bodyEn}
              onChange={(e) => setBodyEn(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">{t("Body (বাংলা)")}</label>
            <textarea
              rows={5}
              value={bodyBn}
              onChange={(e) => setBodyBn(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
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
            disabled={isPending}
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
