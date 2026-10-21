"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import Callout from "@/components/shared/Callout";
import Chip from "@/components/smartly/Chip";
import ErrorState from "@/components/smartly/ErrorState";
import { formatRelativeDay } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { lowerFirst } from "@/lib/text";
import { cn } from "@/lib/utils";
import { legalDocumentsQuery } from "@/queries/legalDocument.queries";
import type { LegalDocType } from "@/types/legalDocument.types";
import { revealEditor, useUnsavedGuard } from "../editorList";
import LegalDocumentEditor from "./LegalDocumentEditor";
import { LEGAL_DOC_LABELS, legalEditorHeadingId } from "./legalDocumentLabels";
import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const NO_DIRTY: ReadonlySet<LegalDocType> = new Set();

// The design's Legal pages: the four documents down the left, the one
// being edited on the right. Every editor stays mounted (just hidden), so
// unsaved edits survive switching between them; the list marks the ones
// with edits, and leaving the tab with any asks first.
const LegalPages = ({ canManage }: { canManage: boolean }) => {
  const { locale, translate } = useLocale();
  const query = useQuery(legalDocumentsQuery());
  const documents = query.data?.data;
  const [selected, setSelected] = useState<string | null>(null);
  const [dirty, setDirty] = useState(NO_DIRTY);
  const current = selected ?? documents?.[0]?.type ?? null;

  const markDirty = useCallback((type: LegalDocType, isDirty: boolean) => {
    setDirty((was) => {
      if (was.has(type) === isDirty) return was;
      const next = new Set(was);
      if (isDirty) next.add(type);
      else next.delete(type);
      return next;
    });
  }, []);
  useUnsavedGuard(dirty.size > 0);

  // An outage isn't "no documents": say they didn't load.
  if (query.isError && !documents) {
    return <ErrorState title={translate("Couldn't load the legal pages")} description={translate("Try again in a moment.")} onRetry={() => void query.refetch()} />;
  }
  if (!documents) return null;
  if (documents.length === 0) {
    return <Callout><T>No legal documents exist yet -- they&apos;re created by the database seed.</T></Callout>;
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <nav aria-label={translate("Legal pages")} className="overflow-hidden rounded-lg border border-line bg-surface shadow-card">
        {documents.map((document) => {
          const on = document.type === current;
          const hasBangla = Boolean(document.contentBn?.trim());
          const unsaved = dirty.has(document.type);
          return (
            <button
              key={document.type}
              type="button"
              // Picks the document in the editor beside it; not a page of its own.
              aria-pressed={on}
              onClick={() => {
                setSelected(document.type);
                requestAnimationFrame(() => revealEditor(window.document.getElementById(legalEditorHeadingId(document.type))));
              }}
              className={cn("flex w-full flex-col gap-0.75 border-b border-divider border-l-3 px-4 py-4 text-left last:border-b-0", on ? "border-l-emerald bg-mint-50" : "border-l-transparent hover:bg-hover")}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <b className="text-body font-semibold text-ink"><T>{LEGAL_DOC_LABELS[document.type]}</T></b>
                  {unsaved && (
                    <span title={translate("Unsaved changes")} className="size-2 shrink-0 rounded-full bg-warning-fill">
                      <span className="sr-only">{translate("Unsaved changes")}</span>
                    </span>
                  )}
                </span>
                <Chip tone="neutral" size="sm">
                  v{formatCount(document.version, locale)}
                </Chip>
              </span>
              <span className="text-small text-ink-muted">
                <T values={{ date: lowerFirst(formatRelativeDay(document.updatedAt, { t: translate })) }}>{"Updated {date}"}</T>
              </span>
              {/* Whether a Bangla text exists, not whether it matches the latest English. */}
              <span className={cn("text-caption", hasBangla ? "text-emerald" : "text-warning")}><T>{hasBangla ? "বাংলা written" : "বাংলা not written yet"}</T></span>
            </button>
          );
        })}
      </nav>
      {documents.map((document) => (
        <div key={document.type} className={cn(document.type !== current && "hidden")}>
          <LegalDocumentEditor document={document} canManage={canManage} onDirtyChange={markDirty} />
        </div>
      ))}
    </div>
  );
};

export default LegalPages;
