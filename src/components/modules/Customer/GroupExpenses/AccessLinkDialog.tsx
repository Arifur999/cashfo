"use client";

import { Check, Copy, Link2, MessageCircle, MessageSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import type { GroupAccessLink } from "@/lib/customer/api";
import { memberJoinPath } from "@/lib/authUtils";
import { formatDay } from "@/lib/date";
import type { FormatLocale } from "@/lib/i18n/formatPrefs";
import type { Translate } from "@/lib/i18n/message";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { PopupDialog } from "../Shared/PopupDialog";

export interface AccessLinkShown {
  link: GroupAccessLink;
  name: string;
  phone: string | null;
  roleLabel: string;
  groupName: string;
}

// The phone number WhatsApp wants: the country code and the digits.
export const whatsappNumber = (phone: string | null): string | null => {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (/^01[3-9]\d{8}$/.test(digits)) return `88${digits}`;
  if (/^8801[3-9]\d{8}$/.test(digits)) return digits;
  return null;
};

// The full address of a link, on whichever site this is.
export const joinUrl = (token: string): string => (typeof window === "undefined" ? memberJoinPath(token) : `${window.location.origin}${memberJoinPath(token)}`);

// The message that goes with a link.
export function linkMessage(shown: AccessLinkShown, url: string, t: Translate, fmt: FormatLocale): string {
  return shown.link.kind === "RESET"
    ? t("Your password reset link for {group} on Smartly: open {link} and set a new password. It works once, until {date}.", { group: shown.groupName, link: url, date: formatDay(shown.link.expiresAt.slice(0, 10), "d MMM", fmt) })
    : t("Join {group} on Smartly as {role}: open {link} and set your username and password. It works once, until {date}.", { group: shown.groupName, role: shown.roleLabel, link: url, date: formatDay(shown.link.expiresAt.slice(0, 10), "d MMM", fmt) });
}

// An access link just made (or copied again), to send (the FamilyMembers
// board's link popup): the link with Copy, the message that goes with it,
// and SMS or WhatsApp to the member's number.
export function AccessLinkDialog({ shown, onClose }: { shown: AccessLinkShown | null; onClose: () => void }) {
  const { t, fmt } = useLocale();
  // What was copied, for this link only (a new link starts uncopied).
  const [copiedState, setCopied] = useState<{ token: string; what: "link" | "message" } | null>(null);
  const copied = copiedState && shown && copiedState.token === shown.link.token ? copiedState.what : null;
  if (!shown) return <PopupDialog open={false} onClose={onClose} title="" />;

  const url = joinUrl(shown.link.token);
  const message = linkMessage(shown, url, t, fmt);
  const wa = whatsappNumber(shown.phone);
  const smsTo = (shown.phone ?? "").replace(/[^\d+]/g, "");
  const copy = async (what: "link" | "message") => {
    try {
      await navigator.clipboard.writeText(what === "link" ? url : message);
      setCopied({ token: shown.link.token, what });
      toast.success(what === "link" ? t("Link copied") : t("Message copied"));
    } catch {
      toast.error(t("Couldn’t copy. Select the text and copy it yourself."));
    }
  };

  return (
    <PopupDialog
      open
      onClose={onClose}
      width={620}
      title={shown.link.kind === "RESET" ? t("Password reset link") : t("Access link")}
      sub={`${shown.name} · ${shown.roleLabel}`}
      lead={
        <span className="flex size-10.5 shrink-0 items-center justify-center rounded-xl bg-emerald-soft text-emerald">
          <Link2 className="size-5" aria-hidden="true" />
        </span>
      }
      footerClassName="justify-start"
      footer={
        <>
          {smsTo && (
            <Button asChild variant="secondary">
              <a href={`sms:${smsTo}?body=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">
                <MessageSquare aria-hidden="true" />
                {t("Send by SMS")}
              </a>
            </Button>
          )}
          {wa && (
            <Button asChild variant="secondary" className="text-income">
              <a href={`https://wa.me/${wa}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle aria-hidden="true" />
                {t("Send on WhatsApp")}
              </a>
            </Button>
          )}
          <span className="flex-1" />
          <Button onClick={onClose}>{t("Done")}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-1.5">
        <span id="access-link-label" className="text-[12px] font-semibold text-ink-muted">
          {t("Link")}
        </span>
        <div className="flex gap-2">
          <input
            readOnly
            aria-labelledby="access-link-label"
            value={url}
            onFocus={(event) => event.currentTarget.select()}
            className="h-10 min-w-0 flex-1 rounded-[10px] border border-emerald-line bg-strip px-3 font-mono text-[12.5px] text-ink outline-none"
          />
          <Button onClick={() => void copy("link")} className="h-10">
            {copied === "link" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {copied === "link" ? t("Copied") : t("Copy")}
          </Button>
        </div>
        <span className="text-caption leading-[1.45] text-ink-muted">
          {t("It works once, until {date}. Making a new link stops this one.", { date: formatDay(shown.link.expiresAt.slice(0, 10), "d MMM yyyy", fmt) })}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 rounded-xl border border-line bg-strip px-3.5 py-3">
        <span className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-semibold text-ink-muted">{t("Message to send")}</span>
          <button type="button" onClick={() => void copy("message")} className="text-small font-semibold text-emerald hover:underline">
            {copied === "message" ? t("Copied") : t("Copy message")}
          </button>
        </span>
        <p className="text-small leading-[1.5] break-words text-ink-2">{message}</p>
      </div>
    </PopupDialog>
  );
}
