"use client";

import { Copy, Gift, Mail, MessageCircle, QrCode, Share } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Input from "@/components/smartly/form/Input";
import { inviteLink, linkText, shareLinks } from "@/lib/customer/referralDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { QrDialog } from "./QrDialog";
import { useCopy } from "./ReferralBits";

interface InviteLinkCardProps {
  code: string;
  // Where the app is served from, as the server page read it.
  origin: string;
  commissionPct: number;
  friendDiscountPct: number;
  holdDays: number;
  // The program is paused: new purchases earn nothing for now.
  paused: boolean;
}

// How long the page waits for the Messenger app to take over before it
// offers another way to share.
const MESSENGER_WAIT_MS = 2000;

// lucide's speech bubble with the Messenger bolt, as the boards draw it.
function MessengerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M12 2C6.5 2 2 6.1 2 11.2c0 2.9 1.5 5.5 3.8 7.2V22l3.5-1.9c.9.3 1.8.4 2.7.4 5.5 0 10-4.1 10-9.2S17.5 2 12 2z" />
      <path d="M7 13.5l3-3.2 2.2 2.2 4.8-3" />
    </svg>
  );
}

// The invite link and code, each copied in a tap, with WhatsApp, Messenger,
// email and a QR code a tap away (ReferralDashboard). Phones get the
// board's card (ReferralMobile): the code, one big WhatsApp button and four
// squares (Messenger, Copy link, QR code, and More for the phone's own
// share sheet).
export function InviteLinkCard({ code, origin, commissionPct, friendDiscountPct, holdDays, paused }: InviteLinkCardProps) {
  const { t, locale } = useLocale();
  const copy = useCopy();
  const [qrOpen, setQrOpen] = useState(false);
  const link = inviteLink(origin, code);
  const message = t("Join me on Smartly, the money and habits app. Sign up with my link:");
  const share = shareLinks(link, message, t("Try Smartly"));
  // A second tap while the first still waits shouldn't stack a second toast.
  const watching = useRef(false);
  const pct = (value: number) => `${formatCount(value, locale)}%`;

  async function shareNatively() {
    if (!navigator.share) {
      await copy(link, t("Link copied"));
      return;
    }
    try {
      await navigator.share({ title: t("Try Smartly"), text: message, url: link });
    } catch {
      // Closing the share sheet is not an error worth a message.
    }
  }

  // The phone tile's link opens the Messenger app. Without the app the page
  // simply stays in front, so after a moment a toast offers the phone's
  // share sheet: from the toast's button, since the sheet needs a fresh tap.
  // The page losing focus counts as leaving too: iOS first asks "Open in
  // 'Messenger'?" and Android may offer a chooser, with the page still
  // showing, and a slow answer there mustn't bring the toast.
  function watchMessenger() {
    if (watching.current) return;
    watching.current = true;
    let left = false;
    const onLeave = () => {
      left = true;
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") left = true;
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("blur", onLeave);
    window.addEventListener("pagehide", onLeave);
    window.setTimeout(() => {
      watching.current = false;
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("blur", onLeave);
      window.removeEventListener("pagehide", onLeave);
      if (!left) toast(t("Messenger didn't open."), { action: { label: t("Share another way"), onClick: () => void shareNatively() } });
    }, MESSENGER_WAIT_MS);
  }

  // Centred and allowed to wrap, so a two-line Bangla label stays tidy.
  const SQUARE = "flex h-15 flex-col items-center justify-center gap-1.25 rounded-xl border border-line bg-surface px-1 text-center text-[11.5px] leading-tight font-semibold text-ink-2 hover:border-line-strong";
  // The desktop row: four 40px pills.
  const PILL = "flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-full border border-line bg-surface px-2 text-[13px] font-semibold whitespace-nowrap text-ink hover:border-line-strong";
  const bold = (text: string) => <b className="font-semibold">{text}</b>;

  return (
    <Card padding="none" className="flex flex-col gap-3 p-4 md:gap-3.5 md:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] leading-normal font-semibold text-ink md:text-title">
          <span className="md:hidden">{t("Invite friends")}</span>
          <span className="hidden md:inline">{t("Your invite link")}</span>
        </h2>
        <span className="flex items-center gap-1.5 text-caption text-ink-muted md:text-[12.5px]">
          {t("Code")} <b className="font-mono font-bold text-ink md:tracking-[0.04em]">{code}</b>
          <button type="button" onClick={() => copy(code, t("Code copied"))} aria-label={t("Copy code")} className="hidden size-6.5 items-center justify-center rounded-full bg-surface-sunken text-ink-soft hover:text-ink md:flex">
            <Copy className="size-3.25" aria-hidden="true" />
          </button>
        </span>
      </div>

      {/* Phones */}
      <div className="flex flex-col gap-3 md:hidden">
        <a href={share.whatsapp} target="_blank" rel="noopener noreferrer" className="flex h-12.5 items-center justify-center gap-2 rounded-xl bg-emerald text-[15px] font-bold text-on-action">
          <MessageCircle className="size-4.75" aria-hidden="true" />
          {t("Share on WhatsApp")}
        </a>
        <div className="grid grid-cols-4 gap-2">
          <a href={share.messenger} onClick={watchMessenger} className={SQUARE}>
            <MessengerIcon className="size-4.5 text-info" />
            Messenger
          </a>
          <button type="button" onClick={() => copy(link, t("Link copied"))} className={SQUARE}>
            <Copy className="size-4.5 text-ink-soft" aria-hidden="true" />
            {t("Copy link")}
          </button>
          <button type="button" onClick={() => setQrOpen(true)} className={SQUARE}>
            <QrCode className="size-4.5 text-ink" aria-hidden="true" />
            {t("QR code")}
          </button>
          <button type="button" onClick={shareNatively} aria-label={t("More ways to share")} className={SQUARE}>
            <Share className="size-4.5 text-ink-soft" aria-hidden="true" />
            {t("More")}
          </button>
        </div>
      </div>

      {/* Wider screens */}
      <div className="hidden gap-2 md:flex">
        <Input size="md" readOnly value={linkText(link)} aria-label={t("Invite link")} onFocus={(event) => event.target.select()} className="text-[13.5px] text-ink-2" frameClassName="min-w-0 flex-1 bg-strip px-3" />
        <Button size="lg" onClick={() => copy(link, t("Link copied"))} className="px-4">
          <Copy className="size-3.75" />
          {t("Copy")}
        </Button>
      </div>
      <div className="hidden grid-cols-4 gap-2 md:grid">
        <a href={share.whatsapp} target="_blank" rel="noopener noreferrer" className={PILL}>
          <MessageCircle className="size-4 shrink-0 text-emerald" aria-hidden="true" />
          WhatsApp
        </a>
        {/* The web has no Messenger share without an app id: Facebook's
            share page, which can send in Messenger. */}
        <a href={share.facebook} target="_blank" rel="noopener noreferrer" className={PILL}>
          <MessengerIcon className="size-4 shrink-0 text-info" />
          Messenger
        </a>
        <a href={share.email} target="_blank" rel="noopener noreferrer" className={PILL}>
          <Mail className="size-4 shrink-0 text-ink-soft" aria-hidden="true" />
          {t("Email")}
        </a>
        <button type="button" onClick={() => setQrOpen(true)} className={PILL}>
          <QrCode className="size-4 shrink-0 text-ink" aria-hidden="true" />
          {t("QR code")}
        </button>
      </div>

      <p className="flex items-start gap-2 rounded-field bg-emerald-soft px-3 py-2.5 text-[12.5px] leading-[1.45] text-ink md:gap-2.5 md:text-[13px]">
        <Gift className="mt-px size-3.75 shrink-0 text-emerald md:mt-0.5 md:size-4" aria-hidden="true" />
        {paused ? (
          <span>{t("The Referral Program is paused. Friends can still sign up with your link, but new purchases don't earn a commission for now.")}</span>
        ) : (
          <>
            <span className="md:hidden">{fillNodes(t("Friends get {discount}. You get {commission} of what they pay."), { discount: bold(t("{pct} off", { pct: pct(friendDiscountPct) })), commission: bold(pct(commissionPct)) })}</span>
            <span className="hidden md:inline">
              {fillNodes(t("{friends} their first plan with your link. You get {commission} of what they pay, {days} days after they pay."), {
                friends: bold(t("Friends get {pct} off", { pct: pct(friendDiscountPct) })),
                commission: pct(commissionPct),
                days: formatCount(holdDays, locale),
              })}
            </span>
          </>
        )}
      </p>
      <QrDialog open={qrOpen} onClose={() => setQrOpen(false)} link={link} code={code} />
    </Card>
  );
}
