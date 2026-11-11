"use client";

import { useQuery } from "@tanstack/react-query";
import { Settings2 } from "lucide-react";
import { useState } from "react";
import FormDialog from "@/components/shared/dialog/FormDialog";
import Button from "@/components/smartly/Button";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { savedRepliesQuery } from "@/queries/ticket.queries";
import SavedRepliesDrawer from "../SavedReplies/SavedRepliesDrawer";

interface SavedReplyPickerProps {
  // The language the person reads: a reply with Bangla text goes in Bangla
  // to a Bangla reader, else in English.
  language: "en" | "bn";
  onPick: (text: string) => void;
}

// The reply box's "Saved replies", as the v16 board opens them: a card
// listing the team's answers, title over text; one tap puts it in the reply
// box, to change before sending. The way to keep the list sits at its foot.
const SavedReplyPicker = ({ language, onPick }: SavedReplyPickerProps) => {
  const { translate } = useLocale();
  const [open, setOpen] = useState(false);
  const [managing, setManaging] = useState(false);
  const query = useQuery({ ...savedRepliesQuery(), enabled: open });
  const replies = query.data?.data;

  return (
    <>
      <Button variant="secondary" size="sm" className="px-3.5" onClick={() => setOpen(true)}>
        <Settings2 className="size-3.75 text-ink-2" aria-hidden="true" />
        {translate("Saved replies")}
      </Button>
      <FormDialog open={open} onOpenChange={setOpen} title="Saved replies" size="lg" closeOnOutsideClick className="sm:max-w-140">
        <div className="flex flex-col gap-2.5">
          <p className="text-small text-ink-muted">{translate("Pick one to put it in the reply box. You can change it before sending.")}</p>
          {!replies ? (
            <p className="py-4 text-small text-ink-muted">{translate(query.isError ? "Couldn't load saved replies" : "Loading...")}</p>
          ) : replies.length === 0 ? (
            <p className="py-4 text-small text-ink-muted">{translate("No saved replies yet.")}</p>
          ) : (
            replies.map((reply) => {
              const text = language === "bn" && reply.bodyBn ? reply.bodyBn : reply.bodyEn;
              return (
                <button
                  key={reply.id}
                  type="button"
                  onClick={() => {
                    onPick(text);
                    setOpen(false);
                  }}
                  className="flex flex-col gap-1 rounded-xl border border-line bg-surface px-3.5 py-3 text-left transition-colors hover:border-mint-200 hover:bg-emerald-soft focus-visible:ring-2 focus-visible:ring-emerald focus-visible:outline-none"
                >
                  <b className="text-body font-semibold text-ink">{reply.title}</b>
                  <span lang={text === reply.bodyBn ? "bn" : undefined} className="text-[13px] leading-normal whitespace-pre-line text-ink-2">
                    {text}
                  </span>
                </button>
              );
            })
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setManaging(true);
            }}
            className="self-start text-small font-semibold text-emerald hover:underline pointer-coarse:min-h-11"
          >
            {translate("Manage saved replies")}
          </button>
        </div>
      </FormDialog>
      <SavedRepliesDrawer open={managing} onOpenChange={setManaging} canManage />
    </>
  );
};

export default SavedReplyPicker;
