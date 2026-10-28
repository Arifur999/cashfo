"use client";

import { useQuery } from "@tanstack/react-query";
import { Settings2 } from "lucide-react";
import { useState } from "react";
import Button from "@/components/smartly/Button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { savedRepliesQuery } from "@/queries/ticket.queries";
import SavedRepliesDrawer from "../SavedReplies/SavedRepliesDrawer";

interface SavedReplyPickerProps {
  // The language the person reads: a reply with Bangla text goes in Bangla
  // to a Bangla reader, else in English.
  language: "en" | "bn";
  onPick: (text: string) => void;
}

// The reply box's "Saved replies": the team's answers by name, one tap to
// drop one into the box, and the way to keep the list.
const SavedReplyPicker = ({ language, onPick }: SavedReplyPickerProps) => {
  const { translate } = useLocale();
  const [open, setOpen] = useState(false);
  const [managing, setManaging] = useState(false);
  const query = useQuery({ ...savedRepliesQuery(), enabled: open });
  const replies = query.data?.data;

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm" className="px-3.5">
            <Settings2 className="size-3.75 text-ink-2" aria-hidden="true" />
            {translate("Saved replies")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-80">
          <DropdownMenuLabel className="text-caption text-ink-muted">{translate("Saved replies")}</DropdownMenuLabel>
          {!replies ? (
            <p className="px-2 py-2 text-small text-ink-muted">{translate(query.isError ? "Couldn't load saved replies" : "Loading...")}</p>
          ) : replies.length === 0 ? (
            <p className="px-2 py-2 text-small text-ink-muted">{translate("No saved replies yet.")}</p>
          ) : (
            replies.map((reply) => {
              const text = language === "bn" && reply.bodyBn ? reply.bodyBn : reply.bodyEn;
              return (
                <DropdownMenuItem key={reply.id} onSelect={() => onPick(text)} className="flex-col items-start gap-0.5">
                  <span className="font-semibold text-ink">{reply.title}</span>
                  <span lang={text === reply.bodyBn ? "bn" : undefined} className="line-clamp-2 text-caption text-ink-muted">
                    {text}
                  </span>
                </DropdownMenuItem>
              );
            })
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setManaging(true)} className="font-semibold text-emerald">
            {translate("Manage saved replies")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SavedRepliesDrawer open={managing} onOpenChange={setManaging} canManage />
    </>
  );
};

export default SavedReplyPicker;
