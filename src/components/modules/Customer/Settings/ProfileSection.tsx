"use client";

import { Camera } from "lucide-react";
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
import { fullPhone, initialsOf, localPhone } from "@/lib/customer/settingsDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { ChangeAvatarDialog } from "./ChangeAvatarDialog";

// Who you are in Smartly: photo, name, email and phone.
export function ProfileSection() {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(localPhone(user.phone ?? ""));
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // The form follows the account once a save lands.
  const [prevUser, setPrevUser] = useState(user);
  if (user !== prevUser) {
    setPrevUser(user);
    setName(user.name);
    setPhone(localPhone(user.phone ?? ""));
  }

  const nameChanged = name.trim() !== user.name;
  const phoneChanged = fullPhone(phone) !== (user.phone ?? "");
  const dirty = nameChanged || phoneChanged;
  const valid = name.trim().length > 0;

  function discard() {
    setName(user.name);
    setPhone(localPhone(user.phone ?? ""));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!dirty || !valid || isPending) return;
    startTransition(async () => {
      const result = await updateProfileAction({ name: name.trim(), phone: fullPhone(phone) });
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
  const facts = [
    { label: t("Email"), value: user.emailVerifiedAt ? t("Verified") : t("Not verified") },
    { label: t("Language"), value: `${locale === "bn" ? "বাংলা" : "English"} · ${t("change in App preferences")}` },
    { label: t("Workspaces"), value: String(user.businesses.length) },
  ];

  return (
    <div className="flex max-w-190 flex-col gap-5">
      <Card padding="none" className="overflow-hidden">
        <form onSubmit={submit}>
          <div className="flex flex-col gap-0.75 px-6 pt-5">
            <h2 className="text-h3 text-ink">{t("Profile")}</h2>
            <span className="text-body text-ink-muted">{t("How you appear in Smartly and in the groups you run.")}</span>
          </div>
          <div className="flex flex-col gap-4 px-6 py-5">
            <div className="flex items-center gap-4">
              {user.avatarUrl ? (
                // A backend-served upload, so a plain <img>.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt="" className="size-18 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex size-18 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--emerald)_0%,var(--forest)_100%)] text-h2 font-bold tracking-wide text-white">{initialsOf(user.name)}</span>
              )}
              <div className="flex flex-col gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setAvatarOpen(true)} className="w-fit">
                  <Camera />
                  {t("Change photo")}
                </Button>
                <span className="text-small text-ink-muted">{t("JPG, PNG, WEBP or GIF, up to 5 MB. A square photo looks best.")}</span>
              </div>
            </div>

            <Field htmlFor="pf-name" label={label(t("Full name"))} hint={t("Shown on your groups, statements and invites.")}>
              <Input id="pf-name" size="md" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} autoComplete="name" />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field htmlFor="pf-email" label={label(t("Email"), <Chip tone={user.emailVerifiedAt ? "income" : "warning"} size="sm">{t(user.emailVerifiedAt ? "Verified" : "Not verified")}</Chip>)} hint={t("To change it, contact support.")}>
                <Input id="pf-email" size="md" value={user.email} readOnly className="text-ink-2" frameClassName="border-line bg-cream" />
              </Field>
              <Field htmlFor="pf-phone" label={label(t("Phone"), <span className="font-normal text-ink-muted">({t("optional")})</span>)} hint={t("Used for group statements.")}>
                <Input id="pf-phone" size="md" type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value.replace(/[^\d-]/g, "").slice(0, 14))} leading={<span className="-ml-3 flex h-full items-center border-r border-line bg-cream px-3 text-body font-medium text-ink-2">+880</span>} className="tabular-nums" autoComplete="tel-national" />
              </Field>
            </div>
          </div>
          <div className="flex items-center gap-3 border-t border-surface-sunken bg-cream px-6 py-4">
            <span className="flex-1 text-small text-ink-muted">{!dirty ? t("Nothing changed yet.") : nameChanged && phoneChanged ? t("You changed your name and phone.") : nameChanged ? t("You changed your name.") : t("You changed your phone.")}</span>
            <Button type="button" variant="secondary" onClick={discard} disabled={!dirty || isPending}>
              {t("Discard")}
            </Button>
            <Button type="submit" variant="action" disabled={!dirty || !valid || isPending} className="px-5">
              {isPending && <Loader />}
              {t("Save changes")}
            </Button>
          </div>
        </form>
      </Card>

      <Card padding="none" elevated={false} className="flex flex-col gap-3 px-6 py-5">
        <h2 className="text-title font-semibold text-ink">{t("Your account")}</h2>
        <dl className="grid gap-3 sm:grid-cols-3">
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
