"use client";

import { Copy, Gift, Link2, Mail, MessageCircle, Send } from "lucide-react";
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
// and email a tap away.
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

  const shares = [
    { label: "WhatsApp", href: share.whatsapp, icon: MessageCircle, className: "text-emerald" },
    { label: "Messenger", href: share.messenger, icon: Send, className: "text-info" },
    { label: t("Email"), href: share.email, icon: Mail, className: "text-ink-2" },
  ];

  return (
    <Card padding="none" className="flex flex-col gap-4 rounded-xl p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-title font-semibold text-ink">{t("Your invite link")}</h2>
        <span className="flex items-center gap-2 text-small text-ink-muted">
          {t("Code")} <b className="font-mono font-bold tracking-wider text-ink">{code}</b>
          <button type="button" onClick={() => copy(code, t("Code copied"))} aria-label={t("Copy code")} className="flex size-6.5 items-center justify-center rounded-sm bg-surface-sunken text-ink-2 hover:text-ink">
            <Copy className="size-3.5" aria-hidden="true" />
          </button>
        </span>
      </div>
      <div className="flex gap-2">
        <input type="text" readOnly value={linkText(link)} aria-label={t("Invite link")} onFocus={(event) => event.target.select()} className="h-11 min-w-0 flex-1 rounded-md border border-line-strong bg-cream px-3 text-body text-ink-2 outline-none" />
        <Button variant="action" onClick={() => copy(link, t("Link copied"))}>
          <Copy />
          {t("Copy")}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
      <div className="flex items-start gap-3 rounded-md bg-mint-50 p-3 text-small leading-normal text-ink">
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
