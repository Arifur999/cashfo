"use client";

import { Check, Users } from "lucide-react";
import { useState } from "react";
import Button from "@/components/smartly/Button";
import IconTile from "@/components/smartly/IconTile";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { GroupMember } from "@/lib/customer/api";
import { shortName } from "@/lib/customer/groupDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { FOCUS_WITHIN, MemberAvatar } from "./GroupBits";

interface CategoryMembersDialogProps {
  open: boolean;
  // The category's name, or "New category" while it is being written.
  category: string;
  members: GroupMember[];
  // Who is ticked to start with.
  initial: string[];
  onClose: () => void;
  onSave: (memberIds: string[]) => void;
}

// "Only selected": tick the members who share a category's costs, equally.
// Everyone ticked means everyone, so Save then clears the choice.
export function CategoryMembersDialog({ open, category, members, initial, onClose, onSave }: CategoryMembersDialogProps) {
  const { t } = useLocale();
  const [picked, setPicked] = useState<string[]>(initial);
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setPicked(initial);
  }
  const toggle = (id: string) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
  const everyone = picked.length === members.length;

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onClose()}>
      <AlertDialogContent className="w-110 max-w-[calc(100vw-32px)] gap-4.5 rounded-[14px] border-0 bg-surface p-6 shadow-overlay ring-0">
        <div className="flex items-start gap-3.5">
          <IconTile tone="money" size={44}>
            <Users />
          </IconTile>
          <div className="flex min-w-0 flex-col gap-1.5">
            <AlertDialogTitle className="text-h3 text-ink">{t("Who shares {category}?", { category })}</AlertDialogTitle>
            <AlertDialogDescription className="text-body leading-[1.55] text-ink-soft">{t("New expenses in it are shared equally among the members you tick. Any single expense can still be changed.")}</AlertDialogDescription>
          </div>
        </div>
        <div className="flex flex-col overflow-hidden rounded-field border border-line">
          {members.map((member) => {
            const on = picked.includes(member.id);
            return (
              <label key={member.id} className={cn("flex min-h-11 cursor-pointer items-center gap-2.5 border-b border-divider px-3 py-1 last:border-b-0", FOCUS_WITHIN)}>
                <input type="checkbox" checked={on} onChange={() => toggle(member.id)} className="sr-only" />
                <span aria-hidden="true" className={cn("flex size-4.5 shrink-0 items-center justify-center rounded-[5px] border", on ? "border-emerald bg-emerald text-on-action" : "border-line-strong bg-surface")}>
                  {on && <Check className="size-3" strokeWidth={3.5} />}
                </span>
                <MemberAvatar member={member} members={members} size={24} />
                <span className={cn("truncate text-body font-medium", on ? "text-ink" : "text-ink-muted")} title={member.name}>
                  {shortName(member.name)}
                </span>
              </label>
            );
          })}
        </div>
        <div className="flex items-center justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button type="button" onClick={() => onSave(everyone ? [] : picked)} disabled={picked.length === 0}>
            {everyone ? t("Share with everyone") : t("Save")}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
