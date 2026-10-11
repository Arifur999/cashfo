"use client";

import { Pencil } from "lucide-react";
import { useOptimistic, useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface EditableTextCellProps {
  value: string;
  // Resolves true once saved; on false the previous text comes back.
  onSave: (next: string) => Promise<boolean>;
  // What's being edited, for screen readers ("English text of auth.logout").
  label: string;
  // Shown (muted) while the value is empty.
  placeholder?: string;
  readOnly?: boolean;
}

// Spreadsheet-style editing in a table cell: click to edit, Enter or
// clicking away saves, Escape cancels. The new text shows at once while it
// saves and reverts if the save fails.
const EditableTextCell = ({ value, onSave, label, placeholder = "—", readOnly = false }: EditableTextCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [shown, setShown] = useOptimistic(value);
  const [isSaving, startTransition] = useTransition();
  // Enter and the blur that follows both finish an edit; only the first counts.
  const editingRef = useRef(false);

  const startEditing = () => {
    editingRef.current = true;
    setDraft(shown);
    setIsEditing(true);
  };

  const finish = (save: boolean) => {
    if (!editingRef.current) return;
    editingRef.current = false;
    setIsEditing(false);

    const next = draft.trim();
    if (!save || next === value) return;
    startTransition(async () => {
      setShown(next);
      await onSave(next);
    });
  };

  const emptyText = <span className="text-muted-foreground italic">{placeholder}</span>;

  if (readOnly) {
    return <span className="whitespace-normal">{value || emptyText}</span>;
  }

  if (isEditing) {
    return (
      <Input
        autoFocus
        value={draft}
        aria-label={label}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => finish(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            finish(true);
          } else if (event.key === "Escape") {
            event.preventDefault();
            finish(false);
          }
        }}
        className="h-8 min-w-48"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      aria-label={`Edit ${label}`}
      aria-busy={isSaving}
      className={cn(
        "group/edit flex w-full min-w-40 items-center justify-between gap-2 rounded-md px-2 py-1 text-left hover:bg-muted",
        isSaving && "opacity-60",
      )}
    >
      <span className="whitespace-normal">{shown || emptyText}</span>
      <Pencil className="size-3 shrink-0 text-muted-foreground opacity-0 group-hover/edit:opacity-100" aria-hidden="true" />
    </button>
  );
};

export default EditableTextCell;
