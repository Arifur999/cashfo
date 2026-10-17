"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Callout from "@/components/shared/Callout";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { legalDocumentsQuery } from "@/queries/legalDocument.queries";
import LegalDocumentEditor from "./LegalDocumentEditor";
import { LEGAL_DOC_LABELS } from "./legalDocumentLabels";

// The design's Legal pages: the four documents down the left, the one
// being edited on the right. Every editor stays mounted (just hidden), so
// unsaved edits survive switching between them.
const LegalPages = ({ canManage }: { canManage: boolean }) => {
  const documents = useQuery(legalDocumentsQuery()).data?.data ?? [];
  const [selected, setSelected] = useState<string | null>(null);
  const current = selected ?? documents[0]?.type ?? null;

  if (documents.length === 0) {
    return <Callout>No legal documents exist yet -- they&apos;re created by the database seed.</Callout>;
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <nav aria-label="Legal pages" className="overflow-hidden rounded-lg border border-line bg-surface shadow-card">
        {documents.map((document) => {
          const on = document.type === current;
          const hasBangla = Boolean(document.contentBn?.trim());
          return (
            <button
              key={document.type}
              type="button"
              aria-current={on ? "page" : undefined}
              onClick={() => setSelected(document.type)}
              className={cn("flex w-full flex-col gap-0.75 border-b border-surface-sunken border-l-3 px-4 py-4 text-left last:border-b-0", on ? "border-l-emerald bg-mint-50" : "border-l-transparent hover:bg-cream")}
            >
              <span className="flex items-center justify-between gap-2">
                <b className="text-body font-semibold text-ink">{LEGAL_DOC_LABELS[document.type]}</b>
                <span className="rounded-full bg-surface-sunken px-2 text-caption font-semibold text-ink-2">v{document.version}</span>
              </span>
              <span className="text-small text-ink-muted">Updated {formatDate(document.updatedAt, "d MMM")}</span>
              <span className={cn("text-caption", hasBangla ? "text-emerald" : "text-warning")}>{hasBangla ? "বাংলা up to date" : "বাংলা not written yet"}</span>
            </button>
          );
        })}
      </nav>
      {documents.map((document) => (
        <div key={document.type} className={cn(document.type !== current && "hidden")}>
          <LegalDocumentEditor document={document} canManage={canManage} />
        </div>
      ))}
    </div>
  );
};

export default LegalPages;
