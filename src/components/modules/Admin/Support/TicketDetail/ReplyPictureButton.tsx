"use client";

import { Paperclip, X } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { REPLY_PICTURE_MAX_BYTES, REPLY_PICTURE_TYPES } from "@/zod/ticket.validation";

// The board's paperclip: one picture (a screenshot of where to tap) to go
// with the reply -- JPEG, PNG or WEBP, 5 MB at most, as a customer's own
// screenshot. A note for admins can't carry one, so it rests while the box
// is on a note.
const ReplyPictureButton = ({ disabled, onPick }: { disabled: boolean; onPick: (file: File) => void }) => {
  const { translate } = useLocale();
  const input = useRef<HTMLInputElement>(null);
  const label = translate(disabled ? "Pictures go with a reply, not a note" : "Attach a picture");

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        aria-label={label}
        title={label}
        onClick={() => input.current?.click()}
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-input bg-surface text-ink-2 transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:size-11"
      >
        <Paperclip className="size-3.75" aria-hidden="true" />
      </button>
      <input
        ref={input}
        type="file"
        accept={REPLY_PICTURE_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          if (!(REPLY_PICTURE_TYPES as readonly string[]).includes(file.type)) return void toast.error(translate("Only JPEG, PNG or WEBP pictures can go with a reply"));
          if (file.size > REPLY_PICTURE_MAX_BYTES) return void toast.error(translate("The picture is bigger than 5 MB"));
          onPick(file);
        }}
      />
    </>
  );
};

// The picked picture under the box, as the board lists a file: its name and
// size, and a cross to take it off.
export const ReplyPictureChip = ({ file, onRemove, className }: { file: File; onRemove: () => void; className?: string }) => {
  const { translate, locale } = useLocale();
  const size = translate("{count} KB", { count: formatCount(Math.max(1, Math.round(file.size / 1024)), locale) });
  return (
    <span className={cn("flex h-7.5 max-w-full items-center gap-1.5 self-start rounded-lg border border-line bg-surface-sunken pr-1 pl-2.5 text-[12.5px] leading-[normal] text-ink-2", className)}>
      <span className="min-w-0 truncate">
        {file.name} · {size}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={translate("Remove the picture")}
        className="flex size-5.5 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-hover hover:text-ink pointer-coarse:size-11"
      >
        <X className="size-3" strokeWidth={2.5} aria-hidden="true" />
      </button>
    </span>
  );
};

export default ReplyPictureButton;
