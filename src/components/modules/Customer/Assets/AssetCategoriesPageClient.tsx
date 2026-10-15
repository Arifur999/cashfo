"use client";

import { Info, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createElement, useState, useTransition } from "react";
import { toast } from "sonner";
import { CategoryDrawer } from "@/components/modules/Customer/Budget/CategoryDrawer";
import { useConfirmDialog } from "@/components/modules/Customer/Shared/useConfirmDialog";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { Asset, AssetCategoryOption } from "@/lib/customer/api";
import { deleteAssetCategoryAction } from "@/lib/customer/assetActions";
import { categoryVisual } from "@/lib/customer/assetDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface AssetCategoriesPageClientProps {
  businessId: string;
  categories: AssetCategoryOption[];
  // Owned assets, for each category's count and value.
  assets: Asset[];
  currency: string;
  canManage: boolean;
}

// Asset categories: one card each with how many assets it holds and what
// they are worth, plus the drawer to add or edit one.
export function AssetCategoriesPageClient({ businessId, categories, assets, currency, canManage }: AssetCategoriesPageClientProps) {
  const { t } = useLocale();
  const router = useRouter();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [drawer, setDrawer] = useState<"closed" | "create" | AssetCategoryOption>("closed");
  const [, startTransition] = useTransition();

  async function remove(category: AssetCategoryOption) {
    if (!(await confirm({ title: `${t("Delete")} ${category.name}?`, message: t("Assets already in it keep the name; it just can't be picked for new ones."), confirmLabel: "Delete category" }))) return;
    startTransition(async () => {
      const result = await deleteAssetCategoryAction(businessId, category.id);
      if (result.success) {
        toast.success(t("Category deleted"));
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to delete category"));
      }
    });
  }

  return (
    <PageFrame className="gap-5">
      <PageHeader
        eyebrow={`${t("Money")} · ${t("Assets")}`}
        title={t("Asset categories")}
        description={t("Group what you own. Click a category to see its assets.")}
        actions={
          canManage && (
            <Button onClick={() => setDrawer("create")}>
              <Plus strokeWidth={2.5} className="size-4" />
              {t("Add category")}
            </Button>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((category) => {
          const visual = categoryVisual(categories, category.name);
          const owned = assets.filter((asset) => asset.category === category.name);
          const value = owned.reduce((sum, asset) => sum + Number(asset.currentValue), 0);
          return (
            <Card key={category.id} className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <span className="flex size-12 items-center justify-center rounded-lg text-white [&_svg]:size-5.5" style={{ background: visual.hex, boxShadow: `0 6px 14px ${visual.hex}40` }}>
                  {createElement(visual.icon, { "aria-hidden": true })}
                </span>
                {canManage && (
                  <span className="flex gap-0.5">
                    <button type="button" onClick={() => setDrawer(category)} aria-label={`${t("Edit")} ${category.name}`} title={t("Edit")} className="flex size-7.5 items-center justify-center rounded-md text-ink-2 hover:bg-cream">
                      <Pencil className="size-3.75" aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => remove(category)} aria-label={`${t("Delete")} ${category.name}`} title={t("Delete")} className="flex size-7.5 items-center justify-center rounded-md text-ink-2 hover:bg-expense-soft hover:text-expense">
                      <Trash2 className="size-3.75" aria-hidden="true" />
                    </button>
                  </span>
                )}
              </div>
              <Link href={`/assets-management/current?category=${encodeURIComponent(category.name)}`} className="flex flex-col gap-1">
                <span className="text-title text-ink">{category.name}</span>
                <span className="text-small text-ink-muted">
                  {owned.length} {t(owned.length === 1 ? "asset" : "assets")}
                </span>
              </Link>
              <div className="flex items-baseline justify-between border-t border-surface-sunken pt-3">
                <span className="text-caption font-normal text-ink-muted">{t("Value today")}</span>
                <span className={cn("text-title font-bold tabular-nums", value > 0 ? "text-ink" : "text-ink-muted")}>{formatCurrency(value, currency)}</span>
              </div>
            </Card>
          );
        })}
        {canManage && (
          <button type="button" onClick={() => setDrawer("create")} className="flex min-h-47.5 flex-col items-center justify-center gap-2 rounded-lg border-[1.5px] border-dashed border-line-strong bg-surface transition-colors hover:border-emerald">
            <span className="flex size-11 items-center justify-center rounded-full bg-mint-50 text-emerald">
              <Plus className="size-5" strokeWidth={2.5} aria-hidden="true" />
            </span>
            <span className="text-body font-semibold text-ink">{t("Add category")}</span>
            <span className="text-caption font-normal text-ink-muted">{t("e.g. Shares, Business, Livestock")}</span>
          </button>
        )}
      </div>

      <span className="flex items-center gap-2 text-small text-ink-muted">
        <Info className="size-3.5 shrink-0" aria-hidden="true" />
        {t("Deleting a category doesn't change the assets already in it.")}
      </span>

      <CategoryDrawer open={drawer !== "closed"} onClose={() => setDrawer("closed")} businessId={businessId} variant="asset" editing={typeof drawer === "object" ? drawer : null} currency={currency} />
      {confirmDialog}
    </PageFrame>
  );
}
