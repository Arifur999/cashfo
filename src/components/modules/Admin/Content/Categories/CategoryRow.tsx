"use client";

import { ArrowDown, ArrowUp, GripVertical, MoreHorizontal } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { localName, type Translate } from "@/lib/i18n/message";
import { cn } from "@/lib/utils";
import type { ICategory } from "@/types/category.types";
import T from "@/components/shared/T";

// "Paid from Cash" for an expense, "Goes to Bank" for income.
const linkText = (category: ICategory, t: Translate, locale: "en" | "bn") =>
  category.linkedAccountTemplate
    ? t(category.type === "EXPENSE" ? "Paid from {name}" : "Goes to {name}", { name: localName(locale, category.linkedAccountTemplate) })
    : t("No account yet");

interface CategoryRowProps {
  category: ICategory;
  canManage: boolean;
  // Its place in the list, for the Move up / Move down menu.
  isFirst: boolean;
  isLast: boolean;
  isDragged: boolean;
  onEdit: () => void;
  // Resolves true once saved.
  onSetActive: (isActive: boolean) => Promise<boolean>;
  onMove: (direction: "up" | "down") => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
}

// One starting category: a handle to drag it into place (or its menu's
// Move up / Move down, for a keyboard or a finger), its names (a name
// opens the editor), where its money goes, and the switch that says
// whether new workspaces still get it. The switch moves at once and holds
// still while it saves.
const CategoryRow = ({ category, canManage, isFirst, isLast, isDragged, onEdit, onSetActive, onMove, onDragStart, onDragEnd, onDrop }: CategoryRowProps) => {
  const { locale, translate } = useLocale();
  const [isActive, setOptimisticActive] = useOptimistic(category.isActive);
  const [isSaving, startTransition] = useTransition();
  const link = linkText(category, translate, locale);

  return (
    <div
      draggable={canManage}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={canManage ? (event) => event.preventDefault() : undefined}
      onDrop={canManage ? onDrop : undefined}
      className={cn("flex min-h-14 items-center gap-3 border-t border-divider px-5 py-2 text-body", isDragged && "opacity-50")}
    >
      {canManage && <GripVertical className="size-4 shrink-0 cursor-grab text-ink-faint" aria-hidden="true" />}
      <button
        type="button"
        onClick={canManage ? onEdit : undefined}
        disabled={!canManage}
        className={cn("flex min-w-0 grow flex-col text-left", canManage && "hover:text-emerald")}
      >
        <span className={cn("truncate font-medium", isActive ? "text-ink" : "text-ink-muted")}>{category.name}</span>
        <span lang="bn" className="truncate font-bn text-small text-ink-muted">
          {category.nameBn}
        </span>
        {/* On a phone the account goes under the names, which keep the width. */}
        <span className="text-caption text-ink-muted sm:hidden">{link}</span>
      </button>
      <span className="hidden shrink-0 text-caption text-ink-muted sm:inline">{link}</span>
      <Switch
        checked={isActive}
        disabled={!canManage || isSaving}
        onCheckedChange={(checked) =>
          startTransition(async () => {
            setOptimisticActive(checked);
            await onSetActive(checked);
          })
        }
        aria-label={translate("Use {name}", { name: category.name })}
        className="data-checked:bg-emerald data-unchecked:bg-line-strong"
      />
      {canManage && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs" className="shrink-0 text-ink-muted hover:text-ink pointer-coarse:size-11" aria-label={translate("Order of {name}", { name: category.name })}>
              <MoreHorizontal aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem disabled={isFirst} onClick={() => onMove("up")}>
              <ArrowUp aria-hidden="true" /> <T>Move up</T>
            </DropdownMenuItem>
            <DropdownMenuItem disabled={isLast} onClick={() => onMove("down")}>
              <ArrowDown aria-hidden="true" /> <T>Move down</T>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

export default CategoryRow;
