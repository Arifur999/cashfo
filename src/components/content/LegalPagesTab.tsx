"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateLegalDocumentAction } from "@/app/admin/(dashboard)/content/_actions";
import type { LegalDocumentRow, LegalDocType } from "@/lib/api";
import { t } from "@/lib/i18n/t";

const LABELS: Record<LegalDocType, string> = {
  TERMS_OF_SERVICE: t("Terms of Service"),
  PRIVACY_POLICY: t("Privacy Policy"),
  REFUND_POLICY: t("Refund Policy"),
  FAQ: t("FAQ"),
};

function DocEditor({
  doc,
  onSaved,
  canManage,
}: {
  doc: LegalDocumentRow;
  onSaved: (updated: LegalDocumentRow) => void;
  canManage: boolean;
}) {
  const [contentEn, setContentEn] = useState(doc.contentEn);
  const [contentBn, setContentBn] = useState(doc.contentBn ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await updateLegalDocumentAction(doc.type, { contentEn, contentBn: contentBn || undefined });
      if (result.success) {
        toast.success(t("Saved — version incremented"));
        onSaved({ ...doc, contentEn, contentBn, version: doc.version + 1 });
      } else {
        toast.error(result.message ?? t("Failed to save"));
      }
    });
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm shadow-black/5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">{LABELS[doc.type]}</h3>
        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-500">
          {t("v")}
          {doc.version}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">{t("English")}</label>
          <textarea
            value={contentEn}
            onChange={(e) => setContentEn(e.target.value)}
            rows={8}
            readOnly={!canManage}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 read-only:bg-neutral-50 read-only:text-neutral-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">{t("Bangla")}</label>
          <textarea
            value={contentBn}
            onChange={(e) => setContentBn(e.target.value)}
            rows={8}
            readOnly={!canManage}
            placeholder={t("Not translated yet")}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 read-only:bg-neutral-50 read-only:text-neutral-500"
          />
        </div>
      </div>
      {canManage && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            disabled={isPending}
            onClick={handleSave}
            className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("Save")}
          </button>
        </div>
      )}
    </div>
  );
}

export function LegalPagesTab({ documents, canManage }: { documents: LegalDocumentRow[]; canManage: boolean }) {
  const [docs, setDocs] = useState(documents);

  return (
    <div className="space-y-4">
      {docs.map((doc) => (
        <DocEditor
          key={doc.id}
          doc={doc}
          canManage={canManage}
          onSaved={(updated) => setDocs((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))}
        />
      ))}
    </div>
  );
}
