"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createAccountTemplateAction,
  deactivateAccountTemplateAction,
  updateAccountTemplateAction,
} from "@/app/admin/(dashboard)/content/_actions";
import type { AccountTemplate, AnnouncementRow, DefaultCategory, LegalDocumentRow, TranslationStringRow } from "@/lib/api";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n/t";
import { AccountTemplateFormModal } from "./AccountTemplateFormModal";
import { AccountTemplatesTree } from "./AccountTemplatesTree";
import { AnnouncementsTab } from "./AnnouncementsTab";
import { CategoriesTable } from "./CategoriesTable";
import { LegalPagesTab } from "./LegalPagesTab";
import { TranslationsTable } from "./TranslationsTable";

type Tab = "accounts" | "categories" | "translations" | "announcements" | "legal";

const TABS: { key: Tab; label: string }[] = [
  { key: "accounts", label: t("Chart of Accounts") },
  { key: "categories", label: t("Categories") },
  { key: "translations", label: t("Translations") },
  { key: "announcements", label: t("Announcements") },
  { key: "legal", label: t("Legal Pages") },
];

interface ContentPageClientProps {
  templates: AccountTemplate[];
  categories: DefaultCategory[];
  translations: TranslationStringRow[];
  announcements: AnnouncementRow[];
  legalDocuments: LegalDocumentRow[];
  canManage: boolean;
}

export function ContentPageClient({ templates, categories, translations, announcements, legalDocuments, canManage }: ContentPageClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("accounts");
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AccountTemplate | null>(null);
  const [isPending, startTransition] = useTransition();

  function openCreateTemplate() {
    setEditingTemplate(null);
    setIsTemplateModalOpen(true);
  }

  function openEditTemplate(template: AccountTemplate) {
    setEditingTemplate(template);
    setIsTemplateModalOpen(true);
  }

  function handleTemplateSubmit(values: Parameters<typeof createAccountTemplateAction>[0]) {
    startTransition(async () => {
      const result = editingTemplate
        ? await updateAccountTemplateAction(editingTemplate.id, values)
        : await createAccountTemplateAction(values);
      if (result.success) {
        toast.success(editingTemplate ? t("Template updated") : t("Template created"));
        setIsTemplateModalOpen(false);
        router.refresh();
      } else {
        toast.error(result.message ?? t("Something went wrong"));
      }
    });
  }

  function handleTemplateDeactivate(template: AccountTemplate) {
    startTransition(async () => {
      const result = await deactivateAccountTemplateAction(template.id);
      if (result.success) {
        toast.success(t("Template deactivated"));
        setIsTemplateModalOpen(false);
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to deactivate"));
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{t("Content & Configuration")}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t("Manage what the end-user app displays, without a code deploy.")}</p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-neutral-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              activeTab === tab.key ? "border-brand-primary text-neutral-900" : "border-transparent text-neutral-500 hover:text-neutral-700",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "accounts" && (
        <div className="space-y-4">
          {canManage && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={openCreateTemplate}
                className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover"
              >
                {t("+ New Account Template")}
              </button>
            </div>
          )}
          <AccountTemplatesTree templates={templates} onEdit={openEditTemplate} />
        </div>
      )}

      {activeTab === "categories" && <CategoriesTable categories={categories} canManage={canManage} />}
      {activeTab === "translations" && <TranslationsTable translations={translations} canManage={canManage} />}
      {activeTab === "announcements" && <AnnouncementsTab announcements={announcements} canManage={canManage} />}
      {activeTab === "legal" && <LegalPagesTab documents={legalDocuments} canManage={canManage} />}

      <AccountTemplateFormModal
        open={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        editing={editingTemplate}
        isSubmitting={isPending}
        onSubmit={handleTemplateSubmit}
        onDeactivate={handleTemplateDeactivate}
      />
    </div>
  );
}
