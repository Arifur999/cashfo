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
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { Switch } from "@/components/ui/switch";
import { updateReferralProfileAction } from "@/lib/customer/referralActions";
import { dayOf, formatWalletNumber, friendDay } from "@/lib/customer/referralDisplay";
import type { PayoutMethod, PayoutMethodType, ReferralProfile } from "@/lib/customer/referralTypes";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PayoutMethodsCard } from "./PayoutMethodsCard";

interface ReferralProfileClientProps {
  profile: ReferralProfile | null;
  methods: PayoutMethod[];
  allowed: PayoutMethodType[];
  avatarUrl: string | null;
  canEarn: boolean;
  today: string;
}

const SECURITY_ROUTE = "/settings/profile";

// Referrals > Profile & payouts (ReferralProfile): the name friends see on
// the invite, the phone and email the payouts use, which emails to get,
// and the accounts the money is sent to.
export function ReferralProfileClient({ profile, methods, allowed, avatarUrl, canEarn, today }: ReferralProfileClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [name, setName] = useState(profile?.inviteName ?? "");
  const [emailEarned, setEmailEarned] = useState(profile?.emailEarned ?? true);
  const [emailPayouts, setEmailPayouts] = useState(profile?.emailPayouts ?? true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!profile) {
    return (
      <PageFrame className="max-md:pt-4 md:gap-5">
        <TopbarExtras title={t("Profile and payouts")} />
        <ErrorState title={t("Couldn't load your referral profile.")} onRetry={() => router.refresh()} />
      </PageFrame>
    );
  }

  const firstName = profile.name.trim().split(/\s+/)[0] ?? profile.name;
  const shownName = name.trim() || firstName;
  const changed = shownName !== profile.inviteName || emailEarned !== profile.emailEarned || emailPayouts !== profile.emailPayouts;

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!changed || isPending || !profile) return;
    startTransition(async () => {
      const result = await updateReferralProfileAction({
        // Their own first name again goes back to following their name.
        referralName: shownName === firstName ? null : shownName,
        emailEarned,
        emailPayouts,
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
    { id: "rp-earned", title: t("A friend pays"), body: t("Email with the amount and your share"), on: emailEarned, set: setEmailEarned },
    { id: "rp-payouts", title: t("We send your money"), body: t("Email with the transaction ID"), on: emailPayouts, set: setEmailPayouts },
  ];

  return (
    <PageFrame className="max-md:gap-3.5 max-md:pt-4 md:gap-5">
      <TopbarExtras title={t("Profile and payouts")} />
      <PageHeader title={t("Profile and payouts")} description={t("How friends see you, and the accounts we pay you to.")} hideDescriptionOnPhone className="max-md:[&_h1]:sr-only" />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 md:gap-5 lg:grid-cols-2">
        <Card padding="none" asChild>
          <form onSubmit={save} noValidate className="flex flex-col">
            <div className="flex items-center gap-3.5 border-b border-divider px-4.5 py-4 md:px-5">
              <Avatar name={profile.name} src={avatarUrl} size={48} tone="soft" alt="" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-title text-ink">{profile.name}</span>
                <span className="truncate text-caption text-ink-muted">
                  {[t("Code {code}", { code: profile.referralCode }), profile.referringSince ? t("referring since {date}", { date: friendDay(dayOf(profile.referringSince), today, fmt) }) : null].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span className={cn("flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-caption font-semibold", canEarn ? "bg-emerald-soft text-brand-ink" : "bg-warning-50 text-warning-ink")}>
                {canEarn && <Check className="size-3.5" strokeWidth={2.5} aria-hidden="true" />}
                {canEarn ? t("Active@@referral") : t("Not earning")}
              </span>
            </div>
            <div className="flex flex-col gap-4 px-4.5 py-4 md:px-5">
              <Field label={t("Name your friends see")} htmlFor="rp-name" hint={t("The sign-up page says: {name} invited you to Smartly.", { name: shownName })}>
                <Input
                  id="rp-name"
                  value={name}
                  maxLength={40}
                  onChange={(event) => {
                    setName(event.target.value);
                    setError(null);
                  }}
                  placeholder={firstName}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label={t("Phone for payout codes")}
                  htmlFor="rp-phone"
                  hint={
                    !profile.phoneVerified && (
                      <Link href={SECURITY_ROUTE} className="font-semibold text-emerald hover:underline">
                        {profile.phone ? t("Verify it in Settings") : t("Add it in Settings")}
                      </Link>
                    )
                  }
                >
                  <Input
                    id="rp-phone"
                    readOnly
                    value={profile.phone ? formatWalletNumber(profile.phone) : t("Not added")}
                    trailing={profile.phoneVerified ? <span className="text-caption font-semibold text-emerald">{t("Verified")}</span> : undefined}
                    frameClassName="bg-strip"
                  />
                </Field>
                <Field label={t("Email for statements")} htmlFor="rp-email">
                  <Input id="rp-email" readOnly value={profile.email} frameClassName="bg-strip" />
                </Field>
              </div>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-small font-semibold text-ink">{t("Tell me when")}</legend>
                {switches.map((item) => (
                  <label key={item.id} htmlFor={item.id} className="flex cursor-pointer items-center gap-3 rounded-field border border-line px-3.5 py-3 hover:border-line-strong">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-body font-semibold text-ink">{item.title}</span>
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
              <Button type="submit" size="lg" disabled={!changed || isPending} className="rounded-full">
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
