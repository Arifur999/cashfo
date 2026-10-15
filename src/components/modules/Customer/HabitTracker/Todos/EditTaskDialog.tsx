"use client";

import { Trash2, X } from "lucide-react";
import { useState } from "react";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { TodoItem } from "@/lib/customer/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface EditTaskDialogProps {
  // The task being edited; null keeps the dialog closed.
  item: TodoItem | null;
  // The day it belongs to, already in words.
  dayLabel: string;
  isPending: boolean;
  onClose: () => void;
  onSave: (item: TodoItem, text: string) => void;
  onDelete: (item: TodoItem) => void;
}

// Reword a task, or delete it.
export function EditTaskDialog({ item, dayLabel, isPending, onClose, onSave, onDelete }: EditTaskDialogProps) {
  const { t } = useLocale();
  const [text, setText] = useState("");

  const [prevId, setPrevId] = useState<string | null>(null);
  const id = item?.id ?? null;
  if (id !== prevId) {
    setPrevId(id);
    setText(item?.text ?? "");
  }

  const valid = text.trim().length > 0;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (valid && item && !isPending) onSave(item, text.trim());
  }

  return (
    <AlertDialog open={item !== null} onOpenChange={(next) => !next && !isPending && onClose()}>
      <AlertDialogContent className="w-110 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-xl border border-line bg-surface p-0 shadow-overlay ring-0">
        <form onSubmit={submit} className="flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-5">
            <AlertDialogTitle className="text-h3 text-ink">{t("Edit task")}</AlertDialogTitle>
            <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-8.5 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
              <X className="size-4.5" aria-hidden="true" />
            </button>
          </div>
          <AlertDialogDescription className="px-6 pt-4 text-small text-ink-muted">{dayLabel}</AlertDialogDescription>
          <div className="px-6 py-4">
            <Field htmlFor="todo-edit" label={<span className="text-body font-medium text-ink">{t("Task")}</span>}>
              <Input id="todo-edit" size="md" autoFocus value={text} onChange={(event) => setText(event.target.value)} maxLength={200} />
            </Field>
          </div>
          <div className="flex items-center gap-3 border-t border-line bg-cream px-6 py-4">
            <Button type="button" variant="ghost" className="text-expense hover:bg-expense-soft hover:text-expense" onClick={() => item && onDelete(item)} disabled={isPending}>
              <Trash2 />
              {t("Delete")}
            </Button>
            <div className="ml-auto flex items-center gap-3">
              <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
                {t("Cancel")}
              </Button>
              <Button type="submit" disabled={!valid || isPending} className="px-5">
                {t("Save changes")}
              </Button>
            </div>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
