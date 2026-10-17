"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Callout from "@/components/shared/Callout";
import { cn } from "@/lib/utils";
import { notificationTemplatesQuery } from "@/queries/notification.queries";
import { CHANNEL_META, templateWhen } from "../notificationOptions";
import TemplateForm from "./TemplateForm";
import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// The design's Templates tab: every template down the left with its
// channel and when it goes out, the one being edited on the right. Every
// editor stays mounted (just hidden), so unsaved edits survive switching.
const TemplatesEditor = ({ canManage }: { canManage: boolean }) => {
  const { translate } = useLocale();
  const templates = useQuery(notificationTemplatesQuery()).data?.data ?? [];
  const [selected, setSelected] = useState<string | null>(null);
  const current = selected ?? templates[0]?.id ?? null;

  if (templates.length === 0) {
    return <Callout><T>No notification templates exist yet -- they&apos;re created by the database seed.</T></Callout>;
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <nav aria-label={translate("Templates")} className="overflow-hidden rounded-lg border border-line bg-surface shadow-card">
        {templates.map((template) => {
          const on = template.id === current;
          const { label, chip } = CHANNEL_META[template.channel];
          return (
            <button
              key={template.id}
              type="button"
              aria-current={on ? "page" : undefined}
              onClick={() => setSelected(template.id)}
              className={cn("flex w-full flex-col gap-1 border-b border-surface-sunken border-l-3 px-4 py-3 text-left last:border-b-0", on ? "border-l-emerald bg-mint-50" : "border-l-transparent hover:bg-cream")}
            >
              <span className="flex items-center justify-between gap-2">
                <code className="font-mono text-small font-semibold text-ink">{template.key}</code>
                <span className={cn("rounded-full px-2 text-caption font-semibold", chip)}>
                  <T>{label}</T>
                </span>
              </span>
              <span className="text-small text-ink-muted">
                <T>{templateWhen(template.key)}</T>
              </span>
            </button>
          );
        })}
      </nav>
      {templates.map((template) => (
        <div key={template.id} className={cn(template.id !== current && "hidden")}>
          <TemplateForm template={template} canManage={canManage} />
        </div>
      ))}
    </div>
  );
};

export default TemplatesEditor;
