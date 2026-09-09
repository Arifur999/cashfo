"use client";

import { Check, Loader2, Pencil, X } from "lucide-react";
import { useState } from "react";

interface EditableCellProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
}

export function EditableCell({ value, onSave }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (draft === value) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    await onSave(draft);
    setIsSaving(false);
    setIsEditing(false);
  }

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(value);
          setIsEditing(true);
        }}
        className="group flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-left hover:bg-neutral-50"
      >
        <span className="truncate">{value}</span>
        <Pencil className="h-3 w-3 shrink-0 text-neutral-300 opacity-0 group-hover:opacity-100" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") setIsEditing(false);
        }}
        className="w-full rounded-lg border border-brand-primary px-2 py-1 text-sm outline-none"
      />
      {isSaving ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-neutral-400" />
      ) : (
        <>
          <button type="button" onClick={handleSave} className="shrink-0 text-brand-primary">
            <Check className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setIsEditing(false)} className="shrink-0 text-neutral-400">
            <X className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}
