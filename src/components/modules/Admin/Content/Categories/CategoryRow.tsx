"use client";

import { GripVertical } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { localName, type Translate } from "@/lib/i18n/message";
import { cn } from "@/lib/utils";
import type { ICategory } from "@/types/category.types";

// "Paid from Cash" for an expense, "Goes to Bank" for income.
const linkText = (category: ICategory, t: Translate, locale: "en" | "bn") =>
  category.linkedAccountTemplate
    ? t(category.type === "EXPENSE" ? "Paid from {name}" : "Goes to {name}", { name: localName(locale, category.linkedAccountTemplate) })
    : t("No account yet");

interface CategoryRowProps {
  category: ICategory;
  canManage: boolean;
  // Its place in the list, for the handle's arrow keys.
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

// One starting category as the board draws it: a handle to drag it into
// place (focused, the arrow keys move it, for a keyboard), its names (a
// name opens the editor), where its money goes, and the switch that says
// whether new workspaces still get it. The switch moves at once and ignores
// presses while it saves, but keeps keyboard focus.
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
      className={cn("flex min-h-14.5 items-center gap-2.5 border-t border-divider px-4.5 py-2.25 text-body", isDragged && "opacity-50")}
    >
      {canManage && (
        <button
          type="button"
          aria-label={translate("Move {name}. Use the up and down arrow keys.", { name: category.name })}
          aria-keyshortcuts="ArrowUp ArrowDown"
          onKeyDown={(event) => {
            if (event.key === "ArrowUp" && !isFirst) {
              event.preventDefault();
              onMove("up");
            } else if (event.key === "ArrowDown" && !isLast) {
              event.preventDefault();
              onMove("down");
            }
          }}
          className="-mx-1 flex shrink-0 cursor-grab items-center justify-center rounded-sm p-1 text-input hover:text-ink-muted pointer-coarse:size-11"
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </button>
      )}
      <button
        type="button"
        onClick={canManage ? onEdit : undefined}
        disabled={!canManage}
        className={cn("flex min-w-0 grow flex-col text-left", canManage && "hover:text-emerald")}
      >
        <span className={cn("truncate font-medium", isActive ? "text-ink" : "text-ink-faint")}>{category.name}</span>
        <span lang="bn" className="truncate font-bn text-small leading-[normal] text-ink-muted">
          {category.nameBn}
        </span>
        {/* On a phone the account goes under the names, which keep the width. */}
        <span className="text-caption text-ink-muted sm:hidden">{link}</span>
      </button>
      <span className="hidden shrink-0 text-caption text-ink-muted sm:inline">{link}</span>
      <Switch
        checked={isActive}
        // It stays enabled while it saves, so keyboard focus stays on it;
        // the handler ignores a press until the save is done.
        disabled={!canManage}
        aria-busy={isSaving}
        onCheckedChange={(checked) => {
          if (isSaving) return;
          startTransition(async () => {
            setOptimisticActive(checked);
            await onSetActive(checked);
          });
        }}
        aria-label={translate("Use {name}", { name: category.name })}
        className={cn("data-checked:bg-emerald data-unchecked:bg-input", isSaving && "cursor-progress opacity-70")}
      />
    </div>
  );
};

export default CategoryRow;
