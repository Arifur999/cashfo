"use client";

import { Camera } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { updateProfileAction } from "@/lib/customer/authActions";
import { cleanLocalPhone, fullPhone, ownWorkspaces, samePhone } from "@/lib/customer/settingsDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getInitials } from "@/lib/text";
import { cn } from "@/lib/utils";
import { ChangeAvatarDialog } from "./ChangeAvatarDialog";

// Who you are in Smartly: photo, name, email and phone.
export function ProfileSection() {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(cleanLocalPhone(user.phone ?? ""));
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

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

  const label = (text: string, extra?: React.ReactNode) => (
    <span className="flex items-center gap-2 text-body font-medium text-ink">
      {text}
      {extra}
    </span>
  );
  // The app has no email check yet, so an address is only ever marked once
  // it is verified, never as "not verified" with nothing to do about it.
  const verified = Boolean(user.emailVerifiedAt);
  const facts = [
    { label: t("Language"), value: `${locale === "bn" ? "বাংলা" : "English"} · ${t("change in App preferences")}` },
    { label: t("Workspaces"), value: formatCount(ownWorkspaces(user.businesses).length, locale) },
  ];
  const status = nameMissing ? t("Enter your name") : !dirty ? t("Nothing changed yet.") : nameChanged && phoneChanged ? t("You changed your name and phone.") : nameChanged ? t("You changed your name.") : t("You changed your phone.");

  return (
    <div className="flex max-w-190 flex-col gap-5">
      <Card padding="none" className="overflow-hidden">
        <form onSubmit={submit} noValidate>
          <div className="flex flex-col gap-0.75 px-6 pt-5">
            <h2 className="text-h3 text-ink">{t("Your details")}</h2>
            <span className="text-body text-ink-muted">{t("How you appear in Smartly and in the groups you run.")}</span>
          </div>
          <div className="flex flex-col gap-4 px-6 py-5">
            <div className="flex items-center gap-4">
              {user.avatarUrl ? (
                // A backend-served upload, so a plain <img>.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt="" className="size-18 shrink-0 rounded-full object-cover" />
              ) : (
                // The top bar's avatar (forest, mint initials), a few sizes up.
                <span aria-hidden="true" className="flex size-18 shrink-0 items-center justify-center rounded-full bg-forest text-h2 font-bold tracking-wide text-mint-200">
                  {getInitials(user.name) || "?"}
                </span>
              )}
              <div className="flex min-w-0 flex-col gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setAvatarOpen(true)} className="w-fit pointer-coarse:h-11">
                  <Camera />
                  {t("Change photo")}
                </Button>
                <span className="text-small text-ink-muted">{t("JPG, PNG, WEBP or GIF, up to 5 MB. A square photo looks best.")}</span>
              </div>
            </div>

            <Field htmlFor="pf-name" label={label(t("Full name"))} hint={t("Shown on your groups, statements and invites.")} error={nameMissing ? t("Enter your name") : undefined}>
              <Input id="pf-name" size="md" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} autoComplete="name" required invalid={nameMissing} />
            </Field>

            <div className="grid gap-4 @lg:grid-cols-2">
              <Field
                htmlFor="pf-email"
                label={label(
                  t("Email"),
                  verified && (
                    <Chip tone="income" size="sm">
                      {t("Verified")}
                    </Chip>
                  ),
                )}
                hint={
                  <Link href="/settings/help" className="font-semibold text-emerald hover:underline">
                    {t("To change it, contact support.")}
                  </Link>
                }
              >
                <Input id="pf-email" size="md" value={user.email} readOnly aria-describedby="pf-email-hint" className="text-ink-2" frameClassName="border-line bg-strip" />
              </Field>
              <Field htmlFor="pf-phone" label={label(t("Phone"), <span className="font-normal text-ink-muted">({t("optional")})</span>)} hint={t("Used for group statements.")}>
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
                  leading={<span className="-ml-3 flex h-full items-center border-r border-line bg-strip px-3 text-body font-medium text-ink-2">+880</span>}
                  aria-describedby="pf-phone-hint"
                  className="tabular-nums"
                  autoComplete="tel-national"
                />
              </Field>
            </div>
          </div>
          {/* The sentence takes the whole line on a narrow card, the buttons
              go under it on the right. */}
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-divider bg-strip px-6 py-4">
            <span className={cn("w-full min-w-0 text-small @lg:w-auto @lg:flex-1", nameMissing ? "font-medium text-expense" : "text-ink-muted")}>{status}</span>
            <Button type="button" variant="secondary" onClick={discard} disabled={!dirty || isPending} className="pointer-coarse:h-11">
              {t("Discard")}
            </Button>
            <Button type="submit" variant="action" disabled={!dirty || nameMissing || isPending} className="px-5 pointer-coarse:h-11">
              {isPending && <Loader />}
              {t("Save changes")}
            </Button>
          </div>
        </form>
      </Card>

      <Card padding="none" elevated={false} className="flex flex-col gap-3 px-6 py-5">
        <h2 className="text-title font-semibold text-ink">{t("Your account")}</h2>
        <dl className="grid gap-3 @md:grid-cols-2">
          {facts.map((fact) => (
            <div key={fact.label} className="flex flex-col gap-0.75">
              <dt className="text-small text-ink-muted">{fact.label}</dt>
              <dd className="text-body font-medium text-ink">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <ChangeAvatarDialog open={avatarOpen} onClose={() => setAvatarOpen(false)} />
    </div>
  );
}
