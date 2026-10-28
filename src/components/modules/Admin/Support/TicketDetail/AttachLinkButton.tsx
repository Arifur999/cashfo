"use client";

import { Paperclip, X } from "lucide-react";
import { useId, useState } from "react";
import Button from "@/components/smartly/Button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { isHttpUrl } from "@/lib/validators";

interface AttachLinkButtonProps {
  // The link going with the next reply, or none.
  value: string | null;
  onChange: (value: string | null) => void;
}

// The board's paperclip beside Saved replies. The admin side has no file
// store yet, so it attaches a link (a guide, a shared screenshot) that the
// reply carries and the customer can open; the button fills while one is set.
const AttachLinkButton = ({ value, onChange }: AttachLinkButtonProps) => {
  const { translate } = useLocale();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const valid = isHttpUrl(draft.trim());

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(value ?? "");
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          size="icon-sm"
          aria-label={translate(value ? "Change the attached link" : "Attach a file")}
          title={value ?? undefined}
          className={cn(value && "border-emerald bg-mint-50 text-brand-ink hover:bg-mint-50")}
        >
          <Paperclip className="size-3.75" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-80 flex-col gap-2.5 p-3.5">
        <label htmlFor={inputId} className="text-small font-medium text-ink">
          {translate("Attach a link")}
        </label>
        <Input id={inputId} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="https://" inputMode="url" autoComplete="off" />
        <span className="text-caption text-ink-muted">{translate("The reply carries it, and the user can open it.")}</span>
        <div className="flex justify-end gap-2">
          {value && (
            <Button
              variant="ghost"
              size="xs"
              className="mr-auto text-expense"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              <X aria-hidden="true" />
              {translate("Remove")}
            </Button>
          )}
          <Button
            size="xs"
            disabled={!valid}
            onClick={() => {
              onChange(draft.trim());
              setOpen(false);
            }}
          >
            {translate("Attach")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AttachLinkButton;
