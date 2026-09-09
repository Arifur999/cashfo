"use client";

import { ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { useState } from "react";
import type { AccountTemplate, AccountType } from "@/lib/api";
import { t } from "@/lib/i18n/t";

const SECTION_ORDER: AccountType[] = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"];
const SECTION_LABELS: Record<AccountType, string> = {
  ASSET: t("Assets"),
  LIABILITY: t("Liabilities"),
  EQUITY: t("Equity"),
  INCOME: t("Income"),
  EXPENSE: t("Expenses"),
};

function WorkspaceBadges({ appliesTo }: { appliesTo: string[] }) {
  return (
    <span className="flex gap-1">
      {appliesTo.includes("PERSONAL") && (
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">{t("Personal")}</span>
      )}
      {appliesTo.includes("BUSINESS") && (
        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700">{t("Business")}</span>
      )}
    </span>
  );
}

function TemplateRow({ template, depth, onEdit }: { template: AccountTemplate; depth: number; onEdit: (t: AccountTemplate) => void }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = (template.children?.length ?? 0) > 0;

  return (
    <>
      <div
        className="flex items-center justify-between border-b border-neutral-50 py-2.5 last:border-0"
        style={{ paddingLeft: depth * 20 }}
      >
        <div className="flex items-center gap-2">
          {hasChildren ? (
            <button type="button" onClick={() => setExpanded((v) => !v)} className="text-neutral-400">
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <span className="w-4" />
          )}
          <div>
            <p className={`text-sm ${template.isActive ? "text-neutral-800" : "text-neutral-400 line-through"}`}>
              {template.name} <span className="text-neutral-400">/ {template.nameBn}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <WorkspaceBadges appliesTo={template.appliesTo} />
          <button type="button" onClick={() => onEdit(template)} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700">
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {hasChildren && expanded && template.children!.map((child) => <TemplateRow key={child.id} template={child} depth={depth + 1} onEdit={onEdit} />)}
    </>
  );
}

interface AccountTemplatesTreeProps {
  templates: AccountTemplate[];
  onEdit: (template: AccountTemplate) => void;
}

export function AccountTemplatesTree({ templates, onEdit }: AccountTemplatesTreeProps) {
  const bySection = new Map<AccountType, AccountTemplate[]>();
  for (const template of templates) {
    const list = bySection.get(template.accountType) ?? [];
    list.push(template);
    bySection.set(template.accountType, list);
  }

  return (
    <div className="space-y-4">
      {SECTION_ORDER.filter((section) => bySection.has(section)).map((section) => (
        <div key={section} className="rounded-2xl bg-white p-5 shadow-sm shadow-black/5">
          <h3 className="mb-2 text-sm font-semibold text-neutral-900">{SECTION_LABELS[section]}</h3>
          <div>
            {bySection.get(section)!.map((template) => (
              <TemplateRow key={template.id} template={template} depth={0} onEdit={onEdit} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
