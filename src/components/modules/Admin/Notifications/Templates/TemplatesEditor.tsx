"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { revealEditor, useUnsavedGuard } from "@/components/modules/Admin/Content/editorList";
import Callout from "@/components/shared/Callout";
import Chip from "@/components/smartly/Chip";
import ErrorState from "@/components/smartly/ErrorState";
import { cn } from "@/lib/utils";
import { notificationTemplatesQuery } from "@/queries/notification.queries";
import type { INotificationTemplateFormValues } from "@/zod/notification.validation";
import { CHANNEL_META, isAutomaticTemplate, templateName, templateWhen } from "../notificationOptions";
import type { INotificationTemplate } from "@/types/notification.types";
import NewTemplateDrawer from "./NewTemplateDrawer";
import TemplateForm from "./TemplateForm";
import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const HEADING_ID = "template-editor-heading";

type Drafts = Readonly<Record<string, INotificationTemplateFormValues>>;
const NO_DRAFTS: Drafts = {};

// The design's Templates tab: every template down the left with its
// channel, when it goes out and whether it is off, the one being edited on
// the right. Only that one's form is mounted (so its fields' ids and
// labels are its own); unsaved wording is kept here while another template
// is open, marked in the list, and leaving the tab with any asks first.
const TemplatesEditor = ({ canManage }: { canManage: boolean }) => {
  const { translate } = useLocale();
  const query = useQuery(notificationTemplatesQuery());
  const templates = query.data?.data;
  const [selected, setSelected] = useState<string | null>(null);
  const [drafts, setDrafts] = useState(NO_DRAFTS);
  const [adding, setAdding] = useState(false);
  const current = templates?.find((template) => template.id === selected) ?? templates?.[0];

  const keepDraft = useCallback((templateId: string, draft: INotificationTemplateFormValues | null) => {
    setDrafts((was) => {
      if ((was[templateId] ?? null) === draft) return was;
      const next: Record<string, INotificationTemplateFormValues> = { ...was };
      if (draft) next[templateId] = draft;
      else delete next[templateId];
      return next;
    });
  }, []);
  useUnsavedGuard(Object.keys(drafts).length > 0);

  // An outage isn't "the seed made none": say they didn't load.
  if (query.isError && !templates) {
    return <ErrorState title={translate("Couldn't load the templates")} description={translate("Try again in a moment.")} onRetry={() => void query.refetch()} />;
  }
  if (!templates || !current) {
    return templates ? <Callout><T>No notification templates exist yet -- they&apos;re created by the database seed.</T></Callout> : null;
  }

  return (
    <div className="flex flex-col gap-4">
      {!canManage && <Callout><T>Only super and content admins can change templates.</T></Callout>}
      <div className="grid items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <nav aria-label={translate("Templates")} className="overflow-hidden rounded-card border border-line-card bg-surface shadow-card">
          {/* The ones campaigns can send first; the app's own messages after, with why editing them does nothing yet. */}
          <GroupHead title={translate("For campaigns")} />
          {[...templates.filter((template) => !isAutomaticTemplate(template.key)), "automatic" as const, ...templates.filter((template) => isAutomaticTemplate(template.key))].map((template: INotificationTemplate | "automatic") => {
            if (template === "automatic") {
              return templates.some((item) => isAutomaticTemplate(item.key)) ? (
                <GroupHead key="automatic" title={translate("Automatic messages")} note={translate("The app sends these on its own when something happens. Turn one on to send your wording; while it is off, the app sends its built-in message.")} />
              ) : null;
            }
            const on = template.id === current.id;
            const { label, tone } = CHANNEL_META[template.channel];
            const unsaved = template.id in drafts;
            return (
              <button
                key={template.id}
                type="button"
                // Picks the template in the editor beside it; not a page of its own.
                aria-pressed={on}
                onClick={() => {
                  setSelected(template.id);
                  requestAnimationFrame(() => revealEditor(document.getElementById(HEADING_ID)));
                }}
                className={cn("flex w-full flex-col gap-1 border-b border-divider px-4 py-3 text-left", on ? "bg-emerald-soft" : "hover:bg-hover")}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-body font-semibold text-ink">
                      <T>{templateName(template.key)}</T>
                    </span>
                    {unsaved && (
                      <span title={translate("Unsaved changes")} className="size-2 shrink-0 rounded-full bg-warning-fill">
                        <span className="sr-only">{translate("Unsaved changes")}</span>
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    {!template.isActive && (
                      <Chip tone="neutral" size="sm">
                        <T>Off</T>
                      </Chip>
                    )}
                    <Chip tone={tone} size="sm" className="font-semibold">
                      <T>{label}</T>
                    </Chip>
                  </span>
                </span>
                <span className="text-[12.5px] leading-[normal] text-ink-muted">
                  <T>{templateWhen(template.key)}</T>
                </span>
                <code className="truncate font-mono text-[11.5px] leading-[normal] text-ink-faint">{template.key}</code>
              </button>
            );
          })}
          {/* An admin-made template, for campaigns (the board's promo_offer). */}
          {canManage && (
            <button type="button" onClick={() => setAdding(true)} className="flex w-full items-center gap-1.5 px-4 py-3 text-left text-small font-semibold text-emerald hover:bg-hover">
              <Plus className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
              {translate("New template")}
            </button>
          )}
        </nav>
        <TemplateForm key={current.id} template={current} canManage={canManage} draft={drafts[current.id]} onDraftChange={keepDraft} headingId={HEADING_ID} />
      </div>
      {canManage && (
        <NewTemplateDrawer
          open={adding}
          onOpenChange={setAdding}
          onCreated={(created) => {
            setSelected(created.id);
            setAdding(false);
          }}
        />
      )}
    </div>
  );
};

// A heading over one part of the templates list.
const GroupHead = ({ title, note }: { title: string; note?: string }) => (
  <div className="flex flex-col gap-0.5 border-b border-divider bg-table-head px-4 py-2">
    <span className="text-caption font-semibold tracking-[0.04em] text-ink-muted uppercase">{title}</span>
    {note && <span className="text-[12px] leading-snug text-ink-muted">{note}</span>}
  </div>
);

export default TemplatesEditor;
