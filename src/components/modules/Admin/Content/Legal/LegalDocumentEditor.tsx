"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { Bold, ExternalLink, Heading, Italic, Link2, List, TriangleAlert, Undo2, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { discardLegalDraftAction, publishLegalDraftAction, saveAndPublishLegalAction, saveLegalDraftAction } from "@/app/(dashboardLayout)/admin/content/legal/_action";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import AppForm from "@/components/shared/form/AppForm";
import Button from "@/components/smartly/Button";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { useActionMutation } from "@/hooks/useActionMutation";
import { formatRelativeDateTime } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural } from "@/lib/i18n/message";
import { toggleHeadingLine } from "@/lib/legalText";
import { queryKeys } from "@/lib/queryKeys";
import { lowerFirst } from "@/lib/text";
import { cn } from "@/lib/utils";
import { legalVersionsQuery } from "@/queries/legalDocument.queries";
import type { ILegalDocument, LegalDocType } from "@/types/legalDocument.types";
import { type ILegalDocumentFormValues, legalDocumentFormZodSchema } from "@/zod/legalDocument.validation";
import { banglaState, LEGAL_DOC_LABELS, LEGAL_DOC_ROUTES, legalEditorHeadingId, toLegalDocumentFormValues } from "./legalDocumentLabels";
import Loader from "@/components/shared/Loader";

const { shape } = legalDocumentFormZodSchema;

type Language = "contentEn" | "contentBn";

const LANGUAGE_OPTIONS = [
  { value: "contentEn" as const, label: "English" },
  { value: "contentBn" as const, label: "বাংলা", lang: "bn" },
];

// "• " at the start of the caret's line, or off again: a list item the
// public page keeps as its own line.
const toggleBulletLine = (text: string, caret: number) => {
  const lineStart = text.lastIndexOf("\n", caret - 1) + 1;
  if (text.startsWith("• ", lineStart)) return { text: text.slice(0, lineStart) + text.slice(lineStart + 2), caret: Math.max(lineStart, caret - 2) };
  return { text: `${text.slice(0, lineStart)}• ${text.slice(lineStart)}`, caret: caret + 2 };
};

const UNDO_DEPTH = 100;

type ToolAction = "heading" | "list" | "undo";

// The board's formatting bar. Bold, italic and links have no way to show on
// the public page yet (it reads plain text with "##" headings), so those
// three stay drawn but off.
const TOOLS: { label: string; icon: LucideIcon; action?: ToolAction; hint?: string }[] = [
  { label: "Heading", icon: Heading, action: "heading", hint: "Make this line a section heading (##)" },
  { label: "Bold", icon: Bold },
  { label: "Italic", icon: Italic },
  { label: "List", icon: List, action: "list", hint: "Make this line a list item" },
  { label: "Link", icon: Link2 },
  { label: "Undo", icon: Undo2, action: "undo" },
];

interface LegalDocumentEditorProps {
  document: ILegalDocument;
  canManage: boolean;
  // Tells the list which documents have edits not yet saved.
  onDirtyChange?: (type: LegalDocType, dirty: boolean) => void;
}

// One document as the board draws it: who published the live version and
// when, the language switch, the formatting bar, the text, and the foot
// that says where the Bangla stands, saves a draft and publishes it as the
// next version. An open draft is loaded in place of the live text, so the
// work carries on where it was left.
const LegalDocumentEditor = ({ document, canManage, onDirtyChange }: LegalDocumentEditorProps) => {
  const { locale, translate } = useLocale();
  const label = translate(LEGAL_DOC_LABELS[document.type]);
  const [language, setLanguage] = useState<Language>("contentEn");
  const editors = useRef<Partial<Record<Language, HTMLTextAreaElement | null>>>({});
  const history = useRef<Record<Language, string[]>>({ contentEn: [], contentBn: [] });
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const draftMeta = document.draft ?? null;
  const versions = useQuery({ ...legalVersionsQuery(document.type), enabled: draftMeta !== null });
  const draft = draftMeta ? versions.data?.data.find((version) => version.id === draftMeta.id) : undefined;
  const invalidateKeys = [queryKeys.legalDocuments.all];

  const save = useActionMutation({
    action: (values: ILegalDocumentFormValues) => saveLegalDraftAction(document.type, values),
    successMessage: "Draft saved",
    invalidateKeys,
    refreshRoute: false,
  });
  // A saved draft goes live by its id; unsaved edits are saved into the
  // draft first, in the same step.
  const publish = useActionMutation({
    action: (what: { draftId: string } | { values: ILegalDocumentFormValues }) =>
      "draftId" in what ? publishLegalDraftAction(document.type, what.draftId) : saveAndPublishLegalAction(document.type, what.values),
    successMessage: (published) => translate("{page} published as version {version}", { page: label, version: formatCount(published.version, locale) }),
    invalidateKeys,
    refreshRoute: false,
  });
  const discard = useActionMutation({
    action: (draftId: string) => discardLegalDraftAction(document.type, draftId),
    successMessage: "Draft discarded",
    invalidateKeys,
    refreshRoute: false,
  });

  // The open draft's text, once it has loaded, is where editing starts;
  // with no draft, the live text. The form follows it while nothing has
  // been typed, and keeps what was typed when it changes.
  const baseline = useMemo(() => (draft ? { contentEn: draft.contentEn, contentBn: draft.contentBn ?? "" } : toLegalDocumentFormValues(document)), [draft, document]);
  const form = useForm({ defaultValues: baseline });
  const isDirty = useStore(form.store, (state) => state.isDirty);
  const values = useStore(form.store, (state) => state.values);

  useEffect(() => {
    onDirtyChange?.(document.type, isDirty);
  }, [onDirtyChange, document.type, isDirty]);

  // A change to one language, kept for Undo.
  const change = (field: Language, next: string) => {
    const stack = history.current[field];
    stack.push(form.getFieldValue(field) ?? "");
    if (stack.length > UNDO_DEPTH) stack.shift();
    form.setFieldValue(field, next);
  };

  const editLine = (edit: (text: string, caret: number) => { text: string; caret: number }) => {
    const editor = editors.current[language];
    if (!editor) return;
    const next = edit(editor.value, editor.selectionStart);
    change(language, next.text);
    requestAnimationFrame(() => {
      editor.focus();
      editor.setSelectionRange(next.caret, next.caret);
    });
  };

  const undo = () => {
    const previous = history.current[language].pop();
    if (previous === undefined) return;
    form.setFieldValue(language, previous);
    editors.current[language]?.focus();
  };

  // Saving keeps the text as a draft; it becomes the new baseline.
  const saveDraft = async () => {
    const value = form.state.values;
    const ok = await save.run(value);
    if (ok) form.reset(value);
    return ok;
  };

  const publishNow = async () => {
    if (isDirty || !draftMeta) {
      const value = form.state.values;
      if (await publish.run({ values: value })) form.reset(value);
      return;
    }
    await publish.run({ draftId: draftMeta.id });
  };

  const discardDraft = async () => {
    if (draftMeta && (await discard.run(draftMeta.id))) {
      form.reset(toLegalDocumentFormValues(document));
      history.current = { contentEn: [], contentBn: [] };
    }
    setConfirmDiscard(false);
  };

  const busy = save.isPending || publish.isPending || discard.isPending;
  const nextVersion = draftMeta?.version ?? document.version + 1;
  const bangla = banglaState(values.contentEn, values.contentBn);
  const publishedBy = document.publishedBy?.name;
  const publishedWhen = lowerFirst(formatRelativeDateTime(document.publishedAt ?? document.updatedAt, { t: translate, locale }));
  const runTool = (action: ToolAction) => {
    if (action === "heading") editLine(toggleHeadingLine);
    else if (action === "list") editLine(toggleBulletLine);
    else undo();
  };

  return (
    <AppForm onSubmit={() => undefined} className="flex flex-col space-y-0 overflow-hidden rounded-card border border-line-card bg-surface shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4.5 py-3.5">
        <div className="flex min-w-0 flex-col gap-0.5">
          {/* Focused when the document is picked on a phone (see LegalPages). */}
          <span className="flex items-center gap-1.5">
            <h2 id={legalEditorHeadingId(document.type)} tabIndex={-1} className="scroll-mt-4 text-title text-ink focus-visible:outline-offset-4">
              {label}
            </h2>
            <a
              href={LEGAL_DOC_ROUTES[document.type]}
              target="_blank"
              rel="noopener noreferrer"
              title={translate("View live page")}
              aria-label={`${translate("View live page")} ${translate("(opens in a new tab)")}`}
              className="flex size-6 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink pointer-coarse:size-11"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </span>
          <span className="text-[12.5px] leading-[normal] text-ink-muted">
            {publishedBy
              ? translate("Live version {version} · published {when} by {name}", { version: formatCount(document.version, locale), when: publishedWhen, name: publishedBy })
              : translate("Live version {version} · published {when}", { version: formatCount(document.version, locale), when: publishedWhen })}
          </span>
        </div>
        <SegmentedControl label="Language" variant="pill" className="rounded-[9px]" options={LANGUAGE_OPTIONS} value={language} onChange={setLanguage} />
      </div>
      {canManage && (
        <div role="toolbar" aria-label={translate("Formatting")} className="flex gap-0.5 border-b border-divider px-3 py-1.5">
          {TOOLS.map(({ label: name, icon: Icon, action, hint }) => (
            <button
              key={name}
              type="button"
              aria-label={translate(name)}
              title={translate(action ? (hint ?? name) : "The public page shows plain text for now")}
              disabled={!action}
              onClick={action && (() => runTool(action))}
              className="flex size-8 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-sunken hover:text-ink disabled:pointer-events-none disabled:opacity-35 pointer-coarse:size-11"
            >
              <Icon className="size-4" strokeWidth={2} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
      {LANGUAGE_OPTIONS.map((option) => (
        <form.Field key={option.value} name={option.value} validators={{ onChange: shape[option.value] }}>
          {(field) => (
            <textarea
              ref={(element) => {
                editors.current[option.value] = element;
              }}
              aria-label={`${label}, ${translate(option.label)}`}
              lang={option.lang}
              value={field.state.value ?? ""}
              onBlur={field.handleBlur}
              onChange={(event) => change(option.value, event.target.value)}
              readOnly={!canManage}
              placeholder={translate(option.value === "contentBn" ? "Not written yet. The app shows the English text until it is." : "The document, as people read it.")}
              // The page's focus ring, drawn inside the card's clipped edge.
              className={cn(
                "min-h-90 w-full resize-y bg-transparent px-6 py-4.5 text-body leading-[1.65] text-ink placeholder:text-ink-faint focus-visible:-outline-offset-2",
                option.lang && "font-bn",
                option.value !== language && "hidden",
              )}
            />
          )}
        </form.Field>
      ))}
      {canManage && (
        <div className="flex flex-wrap items-center gap-2.5 border-t border-line bg-strip px-4.5 py-3">
          <span className={cn("flex items-center gap-1.5 text-[12.5px] leading-[normal]", bangla.kind === "level" ? "text-emerald" : "text-warning")}>
            {bangla.kind !== "level" && <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />}
            {bangla.kind === "empty"
              ? translate("The Bangla version is empty")
              : bangla.kind === "behind"
                ? plural(translate, bangla.sections, "The Bangla version is one section behind", "The Bangla version is {count} sections behind", { count: formatCount(bangla.sections, locale) })
                : translate("Both languages are up to date")}
          </span>
          {(isDirty || draftMeta) && (
            <span className="text-[12.5px] leading-[normal] text-ink-muted">
              · {isDirty ? translate("Unsaved changes") : translate("Draft saved {when}", { when: lowerFirst(formatRelativeDateTime(draftMeta?.updatedAt ?? "", { t: translate, locale })) })}
            </span>
          )}
          {draftMeta && versions.isFetching && !draft && <Loader size={14} label={translate("Loading the draft...")} />}
          <span className="flex-1" />
          {(isDirty || draftMeta) && (
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => (isDirty ? form.reset() : setConfirmDiscard(true))}>
              {translate(isDirty ? "Undo changes" : "Discard draft")}
            </Button>
          )}
          <Button variant="secondary" size="sm" className="text-small" disabled={!isDirty || busy} onClick={() => void saveDraft()}>
            {translate(save.isPending ? "Saving..." : "Save draft")}
          </Button>
          <Button size="sm" className="text-small" disabled={(!isDirty && !draftMeta) || busy} onClick={() => void publishNow()}>
            {translate(publish.isPending ? "Publishing..." : "Publish as version {version}", { version: formatCount(nextVersion, locale) })}
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard this draft?"
        description="The live page stays as it is. What was saved in the draft is lost."
        confirmLabel="Discard draft"
        variant="destructive"
        isPending={discard.isPending}
        onConfirm={() => void discardDraft()}
      />
    </AppForm>
  );
};

export default LegalDocumentEditor;
