"use client";

import { Check, CircleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { TopbarExtras } from "@/components/modules/Customer/Layout/TopbarExtras";
import Loader from "@/components/shared/Loader";
import Avatar from "@/components/smartly/Avatar";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ErrorState from "@/components/smartly/ErrorState";
import Input from "@/components/smartly/form/Input";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { Switch } from "@/components/ui/switch";
import { updateReferralProfileAction } from "@/lib/customer/referralActions";
import { formatWalletNumber } from "@/lib/customer/referralDisplay";
import type { PayoutMethod, PayoutMethodType, ReferralProfile } from "@/lib/customer/referralTypes";
import { formatDate } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PayoutMethodsCard } from "./PayoutMethodsCard";

interface ReferralProfileClientProps {
  profile: ReferralProfile | null;
  methods: PayoutMethod[];
  allowed: PayoutMethodType[];
  avatarUrl: string | null;
  canEarn: boolean;
  // The program's share ("your 20%"); null when it could not be read.
  commissionPct: number | null;
  today: string;
}

const SECURITY_ROUTE = "/settings/profile";

// Referrals > Profile & payouts (ReferralProfile): the name friends see on
// the invite, the phone and email the payouts use, which emails to get,
// and the accounts the money is sent to.
export function ReferralProfileClient({ profile, methods, allowed, avatarUrl, canEarn, commissionPct }: ReferralProfileClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [name, setName] = useState(profile?.inviteName ?? "");
  const [emailEarned, setEmailEarned] = useState(profile?.emailEarned ?? true);
  const [emailPayouts, setEmailPayouts] = useState(profile?.emailPayouts ?? true);
  const [monthly, setMonthly] = useState(profile?.monthlyStatement ?? false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!profile) {
    return (
      <PageFrame className="max-md:pt-4 md:gap-[18px] leading-[normal] md:pt-6 md:pb-8">
        <TopbarExtras heading={t("Profile & payouts")} />
        <ErrorState title={t("Couldn't load your referral profile.")} onRetry={() => router.refresh()} />
      </PageFrame>
    );
  }

  const firstName = profile.name.trim().split(/\s+/)[0] ?? profile.name;
  const shownName = name.trim() || firstName;
  // An older API knows no monthly statement: the switch stays away.
  const hasMonthly = profile.monthlyStatement !== undefined;
  const changed = shownName !== profile.inviteName || emailEarned !== profile.emailEarned || emailPayouts !== profile.emailPayouts || (hasMonthly && monthly !== profile.monthlyStatement);

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!changed || isPending || !profile) return;
    startTransition(async () => {
      const result = await updateReferralProfileAction({
        // Their own first name again goes back to following their name.
        referralName: shownName === firstName ? null : shownName,
        emailEarned,
        emailPayouts,
        ...(hasMonthly && { monthlyStatement: monthly }),
      }).catch(() => null);
      if (result?.success && result.data) {
        setError(null);
        setName(result.data.inviteName);
        toast.success(t("Profile saved"));
        router.refresh();
      } else setError(t(result?.message ?? "Couldn't save your profile."));
    });
  }

  const switches = [
    {
      id: "rp-earned",
      title: t("A friend pays"),
      body: commissionPct === null ? t("Email with the amount and your share") : t("Email with the amount and your {pct}", { pct: `${formatCount(commissionPct, fmt)}%` }),
      on: emailEarned,
      set: setEmailEarned,
    },
    // An SMS to a verified phone, else the email.
    { id: "rp-payouts", title: t("We send your money"), body: profile.phoneVerified ? t("SMS with the transaction ID") : t("Email with the transaction ID"), on: emailPayouts, set: setEmailPayouts },
    ...(hasMonthly ? [{ id: "rp-monthly", title: t("Monthly statement"), body: t("Email on the 1st with last month's earnings"), on: monthly, set: setMonthly }] : []),
  ];
  const LABEL = "text-[13.5px] font-semibold text-ink";
  const BOX = "flex h-10.5 items-center rounded-field border border-line bg-strip px-3 text-body text-ink-2";

  return (
    <PageFrame className="max-md:gap-3.5 max-md:pt-4 md:gap-[18px] leading-[normal] md:pt-6 md:pb-8">
      <TopbarExtras heading={t("Profile & payouts")} />
      <PageHeader title={t("Profile and payouts")} description={t("How friends see you, and the accounts we pay you to.")} hideDescriptionOnPhone className="max-md:[&_h1]:sr-only" />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 md:gap-[18px] lg:grid-cols-2">
        <Card padding="none" asChild>
          <form onSubmit={save} noValidate className="flex flex-col">
            <div className="flex items-center gap-3.5 border-b border-divider px-4.5 py-4 md:px-5 md:py-4.5">
              <Avatar name={profile.name} src={avatarUrl} size={52} tone="soft" alt="" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[17px] font-semibold text-ink">{profile.name}</span>
                <span className="truncate text-[13px] text-ink-muted">
                  {[t("Code {code}", { code: profile.referralCode }), profile.referringSince ? t("affiliate since {date}", { date: formatDate(profile.referringSince, "d MMM yyyy", "", fmt) }) : null].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span className={cn("flex shrink-0 items-center gap-1.25 rounded-full px-2.5 py-0.75 text-caption font-semibold", canEarn ? "bg-mint-50 text-brand-ink" : "bg-warning-50 text-warning-ink")}>
                {canEarn && <Check className="size-3" strokeWidth={2.75} aria-hidden="true" />}
                {canEarn ? t("Active@@referral") : t("Not earning")}
              </span>
            </div>
            <div className="flex flex-col gap-3.5 px-4.5 py-4 md:px-5 md:py-4.5">
              <label htmlFor="rp-name" className="flex flex-col gap-1.5">
                <span className={LABEL}>{t("Name your friends see")}</span>
                <Input
                  id="rp-name"
                  size="md"
                  value={name}
                  maxLength={40}
                  onChange={(event) => {
                    setName(event.target.value);
                    setError(null);
                  }}
                  placeholder={firstName}
                  frameClassName="h-10.5"
                />
                <span className="text-caption leading-[15px] text-ink-muted">{t("The sign-up page says: {name} invited you to Smartly.", { name: shownName })}</span>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <span className={LABEL}>{t("Phone for payout codes")}</span>
                  <span className={cn(BOX, "justify-between gap-2")}>
                    <span className="truncate">{profile.phone ? formatWalletNumber(profile.phone) : t("Not added")}</span>
                    {profile.phoneVerified ? (
                      <span className="shrink-0 text-caption font-semibold text-emerald">{t("Verified")}</span>
                    ) : (
                      <Link href={SECURITY_ROUTE} className="shrink-0 text-caption font-semibold text-emerald hover:underline">
                        {profile.phone ? t("Verify it in Settings") : t("Add it in Settings")}
                      </Link>
                    )}
                  </span>
                </div>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <span className={LABEL}>{t("Email for statements")}</span>
                  <span className={BOX}>
                    <span className="truncate">{profile.email}</span>
                  </span>
                </div>
              </div>
              <fieldset className="flex flex-col gap-2">
                <legend className={cn(LABEL, "mb-2")}>{t("Tell me when")}</legend>
                {switches.map((item) => (
                  <label key={item.id} htmlFor={item.id} className="flex cursor-pointer items-center gap-3 rounded-md border border-line bg-surface px-3 py-2.5 hover:border-line-strong">
                    <span className="flex min-w-0 flex-1 flex-col gap-px">
                      <span className="text-body font-medium text-ink">{item.title}</span>
                      <span className="text-caption text-ink-muted">{item.body}</span>
                    </span>
                    <Switch id={item.id} checked={item.on} onCheckedChange={(next) => item.set(next)} />
                  </label>
                ))}
              </fieldset>
              {error && (
                <p role="alert" className="flex items-start gap-2 rounded-field bg-expense-soft px-3.5 py-2.5 text-small text-expense">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {error}
                </p>
              )}
            </div>
            <div className="flex justify-end rounded-b-card border-t border-line bg-strip px-4.5 py-3.5 md:px-5">
              <Button type="submit" size="lg" disabled={!changed || isPending} className="h-10 rounded-full px-4.5">
                {isPending && <Loader size={16} onDark label={t("Loading...")} />}
                {t("Save profile")}
              </Button>
            </div>
          </form>
        </Card>
        <PayoutMethodsCard methods={methods} userName={profile.name} allowed={allowed} />
      </div>
    </PageFrame>
  );
}
