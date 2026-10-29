"use client";

import { Info, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { IEDialog } from "@/components/modules/Customer/IncomeExpense/IEDialog";
import { useConfirmDialog } from "@/components/modules/Customer/Shared/useConfirmDialog";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { Switch } from "@/components/ui/switch";
import type { Asset, AssetCategoryOption } from "@/lib/customer/api";
import { createAssetCategoryAction, deleteAssetCategoryAction, updateAssetCategoryAction } from "@/lib/customer/assetActions";
import { categoryVisual, isActiveCategory } from "@/lib/customer/assetDisplay";
import { CATEGORY_TONE_COLORS } from "@/lib/customer/categoryTone";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AssetTypeTile } from "./AssetTypeTile";
import { ReadOnlyNote } from "./ReadOnlyNote";

interface AssetCategoriesPageClientProps {
  businessId: string;
  categories: AssetCategoryOption[];
  // Every asset, for each category's count and what was sold.
  assets: Asset[];
  currency: string;
  canManage: boolean;
}

// The board's table: #, Category, Assets, Status, Actions.
const COLUMNS = "md:grid-cols-[48px_minmax(0,1fr)_140px_190px_100px]";

// The board's round icon buttons: edit in ink, delete in red.
const ROW_ACTION = "flex size-11 shrink-0 items-center justify-center rounded-full disabled:opacity-50";

// Asset categories: each one with how many assets it holds, a switch that
// hides it from the Purchase and Add asset dropdowns, and Edit / Delete;
// Add category opens a popup that asks only for the name.
export function AssetCategoriesPageClient({ businessId, categories, assets, canManage }: AssetCategoriesPageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  // The popup: closed, adding, or the category being renamed.
  const [editing, setEditing] = useState<"closed" | "create" | AssetCategoryOption>("closed");
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();
  const [, startRow] = useTransition();
  // The backend keeps the last category: an asset needs one to be filed under.
  const last = categories.length <= 1;

  function open(next: "create" | AssetCategoryOption) {
    setEditing(next);
    setName(next === "create" ? "" : next.name);
    setNameError("");
  }

  function save() {
    const trimmed = name.trim();
    if (!trimmed) return setNameError(t("Please enter a category name."));
    const current = typeof editing === "object" ? editing : null;
    if (categories.some((category) => category.id !== current?.id && category.name.toLowerCase() === trimmed.toLowerCase())) return setNameError(t("A category with this name already exists."));
    startSave(async () => {
      const result = current
        ? await updateAssetCategoryAction(businessId, current.id, { name: trimmed })
        : // A new one takes the next colour round the palette and the plain box icon.
          await createAssetCategoryAction(businessId, { name: trimmed, color: CATEGORY_TONE_COLORS[categories.length % CATEGORY_TONE_COLORS.length] });
      if (!result.success) {
        toast.error(t(result.message ?? "Failed to save the asset type"));
        return;
      }
      toast.success(t(current ? "Category saved" : "Category added"));
      setEditing("closed");
      router.refresh();
    });
  }

  function run(category: AssetCategoryOption, action: () => Promise<{ success: boolean; message?: string }>, done: string, failed: string) {
    setBusyId(category.id);
    startRow(async () => {
      try {
        const result = await action();
        if (result.success) {
          toast.success(t(done));
          router.refresh();
        } else {
          toast.error(t(result.message ?? failed));
        }
      } catch {
        toast.error(t("Couldn't reach Smartly. Check your connection and try again."));
      } finally {
        setBusyId(null);
      }
    });
  }

  async function remove(category: AssetCategoryOption) {
    if (busyId || last) return;
    const label = t(category.name);
    if (!(await confirm({ title: t("Delete {name}?", { name: label }), message: t("Assets already in it keep the name; it just can't be picked for new ones."), confirmLabel: "Delete category", danger: true }))) return;
    run(category, () => deleteAssetCategoryAction(businessId, category.id), "Category deleted", "Failed to delete the asset type");
  }

  const toggle = (category: AssetCategoryOption, on: boolean) =>
    run(category, () => updateAssetCategoryAction(businessId, category.id, { isActive: on }), on ? "Category is active" : "Category is inactive", "Failed to save the asset type");

  return (
    <PageFrame>
      <PageHeader
        title={t("Asset categories")}
        actions={
          canManage && (
            <Button onClick={() => open("create")} className="rounded-full px-4.5">
              <Plus strokeWidth={2.5} className="size-4" />
              {t("Add category")}
            </Button>
          )
        }
      />
      {!canManage && <ReadOnlyNote>{t("Only the owner or an accountant can add or change asset types in this workspace.")}</ReadOnlyNote>}

      <Card padding="none" className="overflow-hidden" role="region" aria-label={t("Category list")}>
        <div className={cn("hidden items-center gap-x-4 border-b border-divider bg-table-head px-6 py-2.5 text-caption font-semibold text-ink-muted md:grid", COLUMNS)}>
          <span>#</span>
          <span>{t("Category")}</span>
          <span>{t("Assets")}</span>
          <span>{t("Status")}</span>
          <span className="text-right">{t("Actions")}</span>
        </div>
        <ul>
          {categories.map((category, index) => {
            const label = t(category.name);
            const active = isActiveCategory(category);
            const owned = assets.filter((asset) => asset.category === category.name && asset.status !== "SOLD").length;
            const sold = assets.filter((asset) => asset.category === category.name && asset.status === "SOLD").length;
            const busy = busyId === category.id;
            const count =
              owned === 0 && sold === 0
                ? t("No assets yet")
                : [owned > 0 || sold === 0 ? t(owned === 1 ? "{count} asset" : "{count} assets", { count: formatCount(owned, fmt) }) : null, sold > 0 ? t("{count} sold", { count: formatCount(sold, fmt) }) : null].filter(Boolean).join(" · ");
            const statusId = `asset-cat-status-${category.id}`;
            return (
              <li
                key={category.id}
                aria-busy={busy || undefined}
                className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b border-divider px-6 py-3 last:border-b-0 md:min-h-17", COLUMNS, !active && "bg-strip")}
              >
                <span className="text-small text-ink-muted tabular-nums max-md:hidden">{formatCount(index + 1, fmt)}</span>
                <span className={cn("flex min-w-0 items-center gap-3", !active && "opacity-60")}>
                  <AssetTypeTile visual={categoryVisual(categories, category.name)} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-body font-semibold text-ink">{label}</span>
                    <span className="text-caption text-ink-muted md:hidden">{count}</span>
                  </span>
                </span>
                <span className={cn("text-small text-ink-2 max-md:hidden", !active && "opacity-60")}>{count}</span>
                <span className="flex items-center gap-3 max-md:col-start-1 max-md:row-start-2">
                  <Switch
                    checked={active}
                    disabled={!canManage || busy}
                    onCheckedChange={(on) => toggle(category, on)}
                    aria-label={t(active ? "Make {name} inactive" : "Activate {name}", { name: label })}
                    aria-describedby={statusId}
                  />
                  <span id={statusId} className="flex flex-col">
                    <span className={cn("text-small font-semibold", active ? "text-income" : "text-ink-muted")}>{t(active ? "Active" : "Inactive")}</span>
                    <span className="text-caption text-ink-muted">{t(active ? "Shows in dropdowns" : "Hidden from dropdowns")}</span>
                  </span>
                </span>
                <span className="flex justify-end gap-1 max-md:col-start-2 max-md:row-span-2 max-md:row-start-1">
                  {canManage && (
                    <>
                      <button type="button" onClick={() => open(category)} disabled={busy} aria-label={t("Edit {name}", { name: label })} title={t("Edit")} className={cn(ROW_ACTION, "text-ink-2 hover:bg-surface-sunken")}>
                        <Pencil className="size-4.25" aria-hidden="true" />
                      </button>
                      {/* The last category says why it stays (its title is read as the description). */}
                      <button
                        type="button"
                        onClick={() => remove(category)}
                        disabled={busy || last}
                        aria-label={t("Delete {name}", { name: label })}
                        title={last ? t("Keep at least one category.") : t("Delete")}
                        className={cn(ROW_ACTION, "text-expense enabled:hover:bg-expense-soft")}
                      >
                        {busy ? <Loader size={14} label={t("Loading...")} /> : <Trash2 className="size-4.25" aria-hidden="true" />}
                      </button>
                    </>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      <span className="flex items-start gap-1.5 text-small text-ink-muted">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        {t("Active categories show in the Purchase and Add asset dropdowns. Inactive ones are hidden there; assets already in them stay as they are.")}
      </span>

      <IEDialog
        open={editing !== "closed"}
        onClose={() => setEditing("closed")}
        title={t(typeof editing === "object" ? "Edit category" : "Add category")}
        busy={isSaving}
        saveLabel={t(typeof editing === "object" ? "Save changes" : "Add category")}
        onSubmit={save}
      >
        <Field htmlFor="asset-cat-name" label={<span className="text-body font-medium text-ink">{t("Category name")}</span>} hint={t("It will show in the Category dropdown of Purchase and Add asset.")} error={nameError || undefined}>
          <Input
            id="asset-cat-name"
            size="md"
            value={name}
            invalid={!!nameError}
            onChange={(event) => {
              setName(event.target.value);
              setNameError("");
            }}
            maxLength={60}
            autoFocus
            placeholder={t("e.g. Shares, Business, Livestock")}
          />
        </Field>
      </IEDialog>
      {confirmDialog}
    </PageFrame>
  );
}
