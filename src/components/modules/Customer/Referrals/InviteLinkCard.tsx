"use client";

import { Copy, Gift, Link2, Mail, MessageCircle, Send, Share2 } from "lucide-react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import { formatCurrency } from "@/lib/customer/currency";
import { inviteLink, linkText, shareLinks } from "@/lib/customer/referralDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface InviteLinkCardProps {
  code: string;
  // Where the app is served from, as the server page read it.
  origin: string;
  rewardPerReferral: string;
  currency: string;
}

// The invite link and code, each copied in a tap, with WhatsApp, Messenger
// and email a tap away. Phones get the board's card: the code, one big
// WhatsApp button and four square shares (Email where the board has a QR
// code, which isn't built; More opens the phone's own share sheet).
export function InviteLinkCard({ code, origin, rewardPerReferral, currency }: InviteLinkCardProps) {
  const { t } = useLocale();
  const link = inviteLink(origin, code);
  const reward = formatCurrency(rewardPerReferral, currency);
  const share = shareLinks(link, t("Join me on Smartly, the money and habits app. Sign up with my link:"), t("Try Smartly"));

  async function copy(text: string, message: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(message);
    } catch {
      toast.error(t("Couldn't copy. Select the text and copy it yourself."));
    }
  }

  async function shareNatively() {
    if (!navigator.share) {
      await copy(link, t("Link copied"));
      return;
    }
    try {
      await navigator.share({ title: t("Try Smartly"), text: t("Join me on Smartly, the money and habits app. Sign up with my link:"), url: link });
    } catch {
      // Closing the share sheet is not an error worth a message.
    }
  }

  const SQUARE = "flex h-15 flex-col items-center justify-center gap-1 rounded-lg border border-line bg-surface text-caption font-semibold text-ink-2";

  const shares = [
    { label: "WhatsApp", href: share.whatsapp, icon: MessageCircle, className: "text-emerald" },
    { label: "Messenger", href: share.messenger, icon: Send, className: "text-info" },
    { label: t("Email"), href: share.email, icon: Mail, className: "text-ink-2" },
  ];

  return (
    <Card padding="none" elevated={false} className="flex flex-col gap-3 rounded-lg p-4 md:gap-4 md:rounded-xl md:p-5 md:shadow-card">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-title font-semibold text-ink">
          <span className="md:hidden">{t("Invite friends")}</span>
          <span className="hidden md:inline">{t("Your invite link")}</span>
        </h2>
        <span className="flex items-center gap-2 text-caption font-normal text-ink-muted md:text-small">
          {t("Code")} <b className="font-mono font-bold text-ink md:tracking-wider">{code}</b>
          <button type="button" onClick={() => copy(code, t("Code copied"))} aria-label={t("Copy code")} className="hidden size-6.5 items-center justify-center rounded-sm bg-surface-sunken text-ink-2 hover:text-ink md:flex">
            <Copy className="size-3.5" aria-hidden="true" />
          </button>
        </span>
      </div>
      <div className="flex flex-col gap-3 md:hidden">
        <a href={share.whatsapp} target="_blank" rel="noopener noreferrer" className="flex h-12.5 items-center justify-center gap-2 rounded-lg bg-emerald text-body-lg font-bold text-on-action">
          <MessageCircle className="size-4.5" aria-hidden="true" />
          {t("Share on WhatsApp")}
        </a>
        <div className="grid grid-cols-4 gap-2">
          <a href={share.messenger} target="_blank" rel="noopener noreferrer" className={SQUARE}>
            <Send className="size-4.5 text-info" aria-hidden="true" />
            Messenger
          </a>
          <button type="button" onClick={() => copy(link, t("Link copied"))} className={SQUARE}>
            <Link2 className="size-4.5 text-ink-2" aria-hidden="true" />
            {t("Copy link")}
          </button>
          <a href={share.email} target="_blank" rel="noopener noreferrer" className={SQUARE}>
            <Mail className="size-4.5 text-ink-2" aria-hidden="true" />
            {t("Email")}
          </a>
          <button type="button" onClick={shareNatively} className={SQUARE}>
            <Share2 className="size-4.5 text-ink-2" aria-hidden="true" />
            {t("More")}
          </button>
        </div>
      </div>
      <div className="hidden gap-2 md:flex">
        <input type="text" readOnly value={linkText(link)} aria-label={t("Invite link")} onFocus={(event) => event.target.select()} className="h-11 min-w-0 flex-1 rounded-md border border-line-strong bg-strip px-3 text-body text-ink-2 outline-none" />
        <Button variant="action" onClick={() => copy(link, t("Link copied"))}>
          <Copy />
          {t("Copy")}
        </Button>
      </div>
      <div className="hidden grid-cols-4 gap-2 md:grid">
        {shares.map((item) => (
          <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" className="flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-surface text-small font-semibold text-ink hover:border-line-strong">
            <item.icon className={`size-4 ${item.className}`} aria-hidden="true" />
            {item.label}
          </a>
        ))}
        <button type="button" onClick={() => copy(link, t("Link copied"))} className="flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-surface text-small font-semibold text-ink hover:border-line-strong">
          <Link2 className="size-4 text-ink-2" aria-hidden="true" />
          {t("Copy link")}
        </button>
      </div>
      <div className="flex items-start gap-2 rounded-md bg-mint-50 p-3 text-small leading-[1.45] text-ink md:gap-3 md:leading-normal">
        <Gift className="mt-0.5 size-4 shrink-0 text-emerald" aria-hidden="true" />
        <span>
          <b className="font-semibold">
            {t("You get")} {reward}
          </b>{" "}
          {t("for every friend who signs up with your link and stays 30 days.")}
        </span>
      </div>
    </Card>
  );
}
