"use client";

import { Check, Copy, ExternalLink, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSyncExternalStore, useState, useTransition } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import { Switch } from "@/components/ui/switch";
import { profileCardPath } from "@/lib/authUtils";
import { setProfileCardSharedAction } from "@/lib/customer/authActions";
import { formatDate } from "@/lib/customer/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { ProfileCard } from "./ProfileCard";

// The site's own address, known only in the browser (empty on the server).
const useOrigin = () =>
  useSyncExternalStore(
    () => () => undefined,
    () => window.location.origin,
    () => "",
  );

// Settings › Profile › Share profile card: a card with the cover, photo and
// name (never the phone, email or address) at a public link that works like
// an invite. Off until turned on; turning it off takes the page down. The
// Referral Program page keeps its own plain link.
export function ProfileCardShare() {
  const { t, fmt } = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const origin = useOrigin();
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const readOnly = Boolean(user.impersonatedBy);
  const shared = user.profileCard?.shared ?? false;
  const code = user.profileCard?.code ?? null;
  const link = shared && code && origin ? `${origin}${profileCardPath(code)}` : "";

  function toggle(next: boolean) {
    startTransition(async () => {
      const result = await setProfileCardSharedAction(next);
      if (result.success) {
        toast.success(t(next ? "Your profile card is shared" : "Your profile card is off"));
        router.refresh();
      } else {
        toast.error(t(result.message ?? "Couldn't change the profile card"));
      }
    });
  }

  function copy() {
    if (!link) return;
    void navigator.clipboard
      .writeText(link)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success(t("Link copied"));
      })
      .catch(() => toast.error(t("Couldn't copy. Select the text and copy it yourself.")));
  }

  // The phone's own share sheet (Facebook, WhatsApp, Messenger...), else a copy.
  function share() {
    if (!link) return;
    if (typeof navigator.share === "function") {
      void navigator.share({ title: t("{name} on Smartly", { name: user.name }), text: t("Join me on Smartly"), url: link }).catch(() => undefined);
    } else copy();
  }

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 px-6 pt-5">
        <div className="flex min-w-0 flex-col gap-0.75">
          <h2 className="text-h3 text-ink">{t("Share your profile card")}</h2>
          <span className="text-[13.5px] text-ink-muted">{t("A card with your cover, photo and name to post anywhere. Friends who join from it use your invite. Your phone, email and address are never on it.")}</span>
        </div>
        <label className="flex shrink-0 items-center gap-2.5 text-body font-medium text-ink pointer-coarse:min-h-11">
          {t(shared ? "On@@sharing" : "Off@@sharing")}
          <Switch checked={shared} onCheckedChange={toggle} disabled={isPending || readOnly} aria-label={t("Share my profile card")} />
        </label>
      </div>
      <div className="grid items-start gap-5 px-6 py-5 @2xl:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
        <ProfileCard
          name={user.name}
          avatarUrl={user.avatarUrl}
          coverUrl={user.coverUrl ?? null}
          since={user.createdAt ? t("With Smartly since {date}", { date: formatDate(user.createdAt, "MMMM yyyy", fmt) }) : ""}
          invite={t("{name} keeps their money in order with Smartly. Join with their invite, it's free to start.", { name: user.name })}
          className={cn(!shared && "opacity-60")}
          footer={code ? <span className="w-fit rounded-full bg-emerald-soft px-3 py-1 font-mono text-small font-semibold text-brand-ink">{code}</span> : undefined}
        />
        <div className="flex min-w-0 flex-col gap-3">
          {shared ? (
            <>
              <span className="text-small font-medium text-ink-2">{t("Your card's link")}</span>
              <div className="flex min-w-0 items-center gap-2 rounded-[12px] border border-line-strong bg-strip py-1.5 pr-1.5 pl-3">
                <span className="min-w-0 flex-1 truncate font-mono text-small text-ink select-all">{link || "…"}</span>
                <Button type="button" variant="secondary" size="sm" onClick={copy} disabled={!link} className="pointer-coarse:h-11">
                  {copied ? <Check /> : <Copy />}
                  {t(copied ? "Copied" : "Copy")}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={share} disabled={!link} className="pointer-coarse:h-11">
                  <Share2 />
                  {t("Share card")}
                </Button>
                <Button asChild variant="secondary" className="pointer-coarse:h-11">
                  <a href={link || undefined} target="_blank" rel="noopener noreferrer">
                    <ExternalLink />
                    {t("Open card")}
                  </a>
                </Button>
              </div>
              <span className="text-caption leading-normal text-ink-muted">{t("Posted on Facebook or WhatsApp, the link shows your card as a picture. Turn sharing off any time and the card stops showing.")}</span>
            </>
          ) : (
            <span className="text-small leading-normal text-ink-muted">{t("Turn it on to get a link you can post on Facebook, WhatsApp or anywhere.")}</span>
          )}
        </div>
      </div>
    </Card>
  );
}
