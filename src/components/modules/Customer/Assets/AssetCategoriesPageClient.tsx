"use client";

import { Info, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CategoryDrawer } from "@/components/modules/Customer/Budget/CategoryDrawer";
import { useConfirmDialog } from "@/components/modules/Customer/Shared/useConfirmDialog";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { Asset, AssetCategoryOption } from "@/lib/customer/api";
import { deleteAssetCategoryAction } from "@/lib/customer/assetActions";
import { categoryVisual } from "@/lib/customer/assetDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AssetTypeTile } from "./AssetTypeTile";
import { ReadOnlyNote } from "./ReadOnlyNote";

interface AssetCategoriesPageClientProps {
  businessId: string;
  categories: AssetCategoryOption[];
  // Owned assets, for each type's count and value.
  assets: Asset[];
  currency: string;
  canManage: boolean;
}

// The card's link covers the card (its ::after), so the card draws the
// focus ring the link can't show on its own.
const CARD_FOCUS = [
  "has-[[data-slot=type-link]:focus-visible]:outline-2",
  "has-[[data-slot=type-link]:focus-visible]:outline-offset-2",
  "has-[[data-slot=type-link]:focus-visible]:outline-(--focus-ring)",
].join(" ");

// 30px icon buttons, 44px under a finger.
const ICON_BUTTON = "flex size-7.5 items-center justify-center rounded-md text-ink-2 disabled:opacity-50 pointer-coarse:size-11";

// Asset types: one card each with how many assets it holds and what they
// are worth (the card opens My assets on that type), plus the drawer to add
// or edit one.
export function AssetCategoriesPageClient({ businessId, categories, assets, currency, canManage }: AssetCategoriesPageClientProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [drawer, setDrawer] = useState<"closed" | "create" | AssetCategoryOption>("closed");
  // The type being deleted: its card waits, and a second press does nothing.
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, startTransition] = useTransition();
  const busyId = isDeleting ? deletingId : null;
  // The backend keeps the last type: an asset needs one to be filed under.
  const last = categories.length <= 1;

  async function remove(category: AssetCategoryOption) {
    if (isDeleting || last) return;
    const name = t(category.name);
    if (!(await confirm({ title: t("Delete {name}?", { name }), message: t("Assets already in it keep the name; it just can't be picked for new ones."), confirmLabel: "Delete asset type" }))) return;
    setDeletingId(category.id);
    startTransition(async () => {
      const result = await deleteAssetCategoryAction(businessId, category.id);
      if (result.success) {
        toast.success(t("Asset type deleted"));
        router.refresh();
      } else {
        toast.error(t(result.message ?? "Failed to delete the asset type"));
      }
    });
  }

  return (
    <PageFrame className="gap-5">
      <PageHeader
        eyebrow={`${t("Money")} · ${t("Assets")}`}
        title={t("Asset types")}
        description={t("Group what you own. Open a type to see its assets.")}
        actions={
          canManage && (
            <Button onClick={() => setDrawer("create")}>
              <Plus strokeWidth={2.5} className="size-4" />
              {t("Add asset type")}
            </Button>
          )
        }
      />
      {!canManage && <ReadOnlyNote>{t("Only the owner or an accountant can add or change asset types in this workspace.")}</ReadOnlyNote>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((category) => {
          const name = t(category.name);
          const owned = assets.filter((asset) => asset.category === category.name);
          const value = owned.reduce((sum, asset) => sum + Number(asset.currentValue), 0);
          const busy = busyId === category.id;
          return (
            <Card key={category.id} interactive aria-busy={busy || undefined} className={cn("relative flex flex-col gap-4", CARD_FOCUS)}>
              <div className="flex items-start justify-between">
                <AssetTypeTile visual={categoryVisual(categories, category.name)} size="xl" />
                {canManage && (
                  // Above the card's link, so they stay their own buttons.
                  <span className="relative z-10 flex gap-0.5">
                    <button type="button" onClick={() => setDrawer(category)} disabled={busy} aria-label={t("Edit {name}", { name })} title={t("Edit")} className={cn(ICON_BUTTON, "hover:bg-surface-sunken")}>
                      <Pencil className="size-3.75" aria-hidden="true" />
                    </button>
                    {/* The last type says why it stays (its title is read as the description). */}
                    <button
                      type="button"
                      onClick={() => remove(category)}
                      disabled={busy || last}
                      aria-label={t("Delete {name}", { name })}
                      title={last ? t("Keep at least one asset type.") : t("Delete")}
                      className={cn(ICON_BUTTON, "enabled:hover:bg-expense-soft enabled:hover:text-expense")}
                    >
                      {busy ? <Loader size={14} label={t("Deleting...")} /> : <Trash2 className="size-3.75" aria-hidden="true" />}
                    </button>
                  </span>
                )}
              </div>
              <Link href={`/assets-management/current?category=${encodeURIComponent(category.name)}`} data-slot="type-link" className="flex flex-col gap-1 after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none">
                <span className="text-title text-ink">{name}</span>
                <span className="text-small text-ink-muted">{t(owned.length === 1 ? "{count} asset" : "{count} assets", { count: formatCount(owned.length, locale) })}</span>
              </Link>
              <div className="flex items-baseline justify-between gap-3 border-t border-divider pt-3">
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
            <span className="text-body font-semibold text-ink">{t("Add asset type")}</span>
            <span className="text-caption font-normal text-ink-muted">{t("e.g. Shares, Business, Livestock")}</span>
          </button>
        )}
      </div>

      <span className="flex items-center gap-2 text-small text-ink-muted">
        <Info className="size-3.5 shrink-0" aria-hidden="true" />
        {t("Deleting an asset type doesn't change the assets already in it.")}
      </span>

      <CategoryDrawer open={drawer !== "closed"} onClose={() => setDrawer("closed")} businessId={businessId} variant="asset" editing={typeof drawer === "object" ? drawer : null} currency={currency} />
      {confirmDialog}
    </PageFrame>
  );
}
