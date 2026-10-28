"use client";

import { Camera } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import Loader from "@/components/shared/Loader";
import Avatar from "@/components/smartly/Avatar";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { updateProfileAction } from "@/lib/customer/authActions";
import { formatDate } from "@/lib/customer/date";
import { cleanLocalPhone, fullPhone, samePhone } from "@/lib/customer/settingsDisplay";
import { formatRelativeDateTime } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { ChangeAvatarDialog } from "./ChangeAvatarDialog";
import { VerifyPhoneDialog } from "./VerifyPhoneDialog";
import { useVerifyEmail } from "./useVerifyEmail";

interface ProfileSectionProps {
  // The newest successful sign-in (the history's), for "Last sign-in";
  // null when it couldn't be read.
  lastSignIn?: string | null;
}

// Who you are in Smartly (design-v4 SettingsProfile): photo, name, email
// and phone, then the account's facts.
export function ProfileSection({ lastSignIn = null }: ProfileSectionProps) {
  const { t, locale, fmt } = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(cleanLocalPhone(user.phone ?? ""));
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [verifyPhoneOpen, setVerifyPhoneOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const verify = useVerifyEmail();
  const readOnly = Boolean(user.impersonatedBy);

  // The form follows the account once a save lands.
  const [prevUser, setPrevUser] = useState(user);
  if (user !== prevUser) {
    setPrevUser(user);
    setName(user.name);
    setPhone(cleanLocalPhone(user.phone ?? ""));
  }

  const nameChanged = name.trim() !== user.name;
  // Sign-up keeps a number as typed ("01711-482915", "+880 1711 482915"), so
  // the field and the account are compared as numbers, not as text: an
  // untouched form is never "changed".
  const phoneChanged = !samePhone(fullPhone(phone), user.phone ?? "");
  const dirty = nameChanged || phoneChanged;
  const nameMissing = name.trim().length === 0;

  function discard() {
    setName(user.name);
    setPhone(cleanLocalPhone(user.phone ?? ""));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!dirty || nameMissing || isPending) return;
    // Only what changed: a number kept as sign-up wrote it stays that way.
    const changes = { ...(nameChanged && { name: name.trim() }), ...(phoneChanged && { phone: fullPhone(phone) }) };
    startTransition(async () => {
      const result = await updateProfileAction(changes);
      if (result.success) {
        toast.success(t("Profile updated"));
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to update profile"));
      }
    });
  }

  const verified = user.emailVerified ?? Boolean(user.emailVerifiedAt);
  // The saved number's state; nothing while the field holds an unsaved one.
  const savedPhone = Boolean(user.phone) && !phoneChanged;
  const phoneVerified = Boolean(user.phoneVerifiedAt);
  const facts = [
    { label: t("Member since"), value: user.createdAt ? formatDate(user.createdAt, "MMMM yyyy", fmt) : "—" },
    { label: t("Last sign-in"), value: lastSignIn ? formatRelativeDateTime(lastSignIn, { t, locale: fmt }) : "—" },
    { label: t("Language"), value: `${locale === "bn" ? "বাংলা" : "English"} · ${t("change in App preferences")}` },
  ];
  const status = nameMissing ? t("Enter your name") : !dirty ? t("Nothing changed yet.") : nameChanged && phoneChanged ? t("You changed your name and phone.") : nameChanged ? t("You changed your name.") : t("You changed your phone.");
  const supportLink = (
    <Link href="/settings/help" className="hover:underline">
      {t("to change it, contact support")}
    </Link>
  );

  return (
    <div className="flex flex-col gap-5">
      <Card padding="none" className="overflow-hidden">
        <form onSubmit={submit} noValidate>
          <div className="flex flex-col gap-0.75 px-6 pt-5">
            <h2 className="text-h3 text-ink">{t("Profile")}</h2>
            <span className="text-[13.5px] text-ink-muted">{t("How you appear in Smartly and in the groups you run.")}</span>
          </div>
          <div className="flex flex-col gap-4.5 px-6 py-5">
            <div className="flex items-center gap-4.5">
              <Avatar name={user.name} src={user.avatarUrl} size={72} tone="soft" alt="" className="tracking-wide" />
              <div className="flex min-w-0 flex-col gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setAvatarOpen(true)} disabled={readOnly} className="w-fit px-3.5 text-[13.5px] pointer-coarse:h-11">
                  <Camera className="size-3.75 text-ink-soft" />
                  {t("Change photo")}
                </Button>
                <span className="text-[12.5px] text-ink-muted">{t("JPG, PNG, WEBP or GIF, up to 5 MB. A square photo looks best.")}</span>
              </div>
            </div>

            <Field htmlFor="pf-name" label={t("Full name")} hint={<span className="text-[12.5px]">{t("Shown on your groups, statements and invites.")}</span>} error={nameMissing ? t("Enter your name") : undefined}>
              <Input id="pf-name" size="md" className="text-[14.5px]" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} autoComplete="name" required invalid={nameMissing} readOnly={readOnly} />
            </Field>

            <div className="grid gap-3.5 @lg:grid-cols-2">
              <Field
                htmlFor="pf-email"
                label={
                  <span className="flex items-center gap-2">
                    {t("Email")}
                    {verified ? (
                      <Chip tone="income" size="sm" className="h-4.5 px-2 text-[11.5px]">
                        {t("Verified")}
                      </Chip>
                    ) : (
                      <Chip tone="warning" size="sm" className="h-4.5 px-2 text-[11.5px]">
                        {t("Not verified")}
                      </Chip>
                    )}
                  </span>
                }
                hint={
                  <span className="text-[12.5px]" aria-live="polite">
                    {verified ? (
                      <Link href="/settings/help" className="font-semibold text-emerald hover:underline">
                        {t("To change it, contact support.")}
                      </Link>
                    ) : user.emailReady === false ? (
                      <>
                        {t("Email isn't set up on Smartly yet.")} {supportLink}
                      </>
                    ) : verify.sentTo ? (
                      <>
                        {t("Link sent to {email}.", { email: verify.sentTo })} {supportLink}
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={verify.send} disabled={verify.sending || readOnly} className="inline-flex items-center gap-1 font-semibold text-emerald hover:underline disabled:opacity-60 pointer-coarse:min-h-11">
                          {verify.sending && <Loader size={12} />}
                          {t("Send a verification email")}
                        </button>
                        {" · "}
                        {supportLink}
                      </>
                    )}
                  </span>
                }
              >
                <Input id="pf-email" size="md" value={user.email} readOnly aria-describedby="pf-email-hint" className="text-[14.5px] text-ink-soft" frameClassName="border-line bg-strip" />
              </Field>
              <Field
                htmlFor="pf-phone"
                label={
                  <span className="flex items-center gap-2">
                    <span>
                      {t("Phone")} <span className="font-normal text-ink-muted">({t("optional")})</span>
                    </span>
                    {savedPhone && (
                      <Chip tone={phoneVerified ? "income" : "warning"} size="sm" className="h-4.5 px-2 text-[11.5px]">
                        {phoneVerified ? t("Verified") : t("Not verified")}
                      </Chip>
                    )}
                  </span>
                }
                hint={
                  <span className="text-[12.5px]">
                    {savedPhone && phoneVerified ? (
                      t("Codes come here by SMS. You can reset your password with it too.")
                    ) : savedPhone ? (
                      <>
                        <button type="button" onClick={() => setVerifyPhoneOpen(true)} disabled={readOnly} className="font-semibold text-emerald hover:underline disabled:opacity-60 pointer-coarse:min-h-11">
                          {t("Verify by SMS")}
                        </button>
                        {" · "}
                        {t("to get codes by SMS and reset your password with it.")}
                      </>
                    ) : phoneChanged && phone ? (
                      t("Save the number, then verify it by SMS.")
                    ) : (
                      t("Used for withdrawal codes and group statements.")
                    )}
                  </span>
                }
              >
                <Input
                  id="pf-phone"
                  size="md"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  // Bangla digits work, and a whole number pasted with its
                  // +880 or 0 keeps only the part after the box's +880.
                  onChange={(event) => setPhone(cleanLocalPhone(event.target.value))}
                  placeholder="1XXX-XXXXXX"
                  leading={<span className="-ml-3 flex h-full items-center border-r border-line bg-strip px-2.5 text-body font-medium text-ink-2">+880</span>}
                  aria-describedby="pf-phone-hint"
                  className="text-[14.5px] tabular-nums"
                  autoComplete="tel-national"
                  readOnly={readOnly}
                />
              </Field>
            </div>
          </div>
          {/* The sentence takes the whole line on a narrow card, the buttons
              go under it on the right. */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-divider bg-strip px-6 py-3.5">
            <span className={cn("w-full min-w-0 text-small @lg:w-auto @lg:flex-1", nameMissing ? "font-medium text-expense" : "text-ink-muted")}>{status}</span>
            <Button type="button" variant="secondary" onClick={discard} disabled={!dirty || isPending} className="px-3.5 pointer-coarse:h-11">
              {t("Discard")}
            </Button>
            <Button type="submit" disabled={!dirty || nameMissing || isPending || readOnly} className="px-4.5 pointer-coarse:h-11">
              {isPending && <Loader />}
              {t("Save changes")}
            </Button>
          </div>
        </form>
      </Card>

      <Card padding="none" className="flex flex-col gap-3 px-6 py-4.5">
        <h2 className="text-title font-semibold text-ink">{t("Your account")}</h2>
        <dl className="grid gap-3 @md:grid-cols-3">
          {facts.map((fact) => (
            <div key={fact.label} className="flex flex-col gap-0.75">
              <dt className="text-[12.5px] text-ink-muted">{fact.label}</dt>
              <dd className="text-body font-medium text-ink">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <ChangeAvatarDialog open={avatarOpen} onClose={() => setAvatarOpen(false)} />
      <VerifyPhoneDialog open={verifyPhoneOpen} phone={`+880 ${cleanLocalPhone(user.phone ?? "")}`} onClose={() => setVerifyPhoneOpen(false)} onVerified={() => router.refresh()} />
    </div>
  );
}
