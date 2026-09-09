"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import type { NotificationTemplateRow } from "@/lib/api";
import { t } from "@/lib/i18n/t";
import { EditTemplateModal } from "./EditTemplateModal";
import { NotificationChannelBadge } from "./NotificationChannelBadge";

interface TemplatesClientProps {
  templates: NotificationTemplateRow[];
  canManage: boolean;
}

export function TemplatesClient({ templates, canManage }: TemplatesClientProps) {
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplateRow | null>(null);

  if (templates.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center text-neutral-400 shadow-sm shadow-black/5">
        {t("No notification templates yet.")}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <div key={template.id} className="flex flex-col rounded-2xl bg-white p-5 shadow-sm shadow-black/5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-mono text-xs text-neutral-500">{template.key}</p>
              <div className="mt-1.5">
                <NotificationChannelBadge channel={template.channel} />
              </div>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={() => setEditingTemplate(template)}
                aria-label={t("Edit")}
                className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="mt-3 line-clamp-3 text-sm text-neutral-600">{template.bodyEn}</p>
          <div className="mt-3 flex flex-wrap gap-1">
            {template.variables.map((v) => (
              <span key={v} className="rounded-full bg-neutral-100 px-2 py-0.5 font-mono text-[10px] text-neutral-500">
                {`{{${v}}}`}
              </span>
            ))}
          </div>
        </div>
      ))}

      {editingTemplate && (
        <EditTemplateModal open={Boolean(editingTemplate)} onClose={() => setEditingTemplate(null)} template={editingTemplate} />
      )}
    </div>
  );
}
