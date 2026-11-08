"use client";

import { Camera, Check, Copy, Crown, Lock, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { usePlanChip } from "@/components/modules/Customer/Providers/PlanProvider";
import Loader from "@/components/shared/Loader";
import Avatar from "@/components/smartly/Avatar";
import Button from "@/components/smartly/Button";
import PageFrame from "@/components/smartly/PageFrame";
import DayInput from "@/components/smartly/form/DayInput";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import Textarea from "@/components/smartly/form/Textarea";
import type { UpdateProfileInput } from "@/lib/customer/authActions";
import { removeAvatarAction, restoreAvatarAction, updateProfileAction, uploadAvatarAction } from "@/lib/customer/authActions";
import { formatDate } from "@/lib/customer/date";
import { districtOptions } from "@/lib/customer/districts";
import type { ProfileReferral } from "@/lib/customer/referralTypes";
import { PLANS_ROUTE } from "@/lib/customer/nav";
import { birthDateProblem, nameProblem, phoneProblem, PROFILE_FIELD_LABELS, profileCompleteness, saveBarText, secondPhoneProblem, type ProfileCheck, type ProfileField } from "@/lib/customer/profileRules";
import { cleanLocalPhone, fullPhone, samePhone } from "@/lib/customer/settingsDisplay";
import { formatRelativeDateTime } from "@/lib/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CARD, SELECT } from "./boardUi";
import { ChangePhotoDialog } from "./ChangePhotoDialog";
import { PhotoCropDialog } from "./PhotoCropDialog";
import { ProfileCardShare } from "./ProfileCardShare";
import { CheckInboxDialog, LeaveDialog, RemovePhotoDialog } from "./ProfileDialogs";
import { SettingsBack } from "./SettingsBack";
import { useLeaveGuard } from "./useLeaveGuard";
import { useVerifyEmail } from "./useVerifyEmail";
import { VerifyPhoneDialog } from "./VerifyPhoneDialog";

interface ProfileSectionProps {
  // The newest successful sign-in (the history's), for "Last sign-in";
  // null when it couldn't be read.
  lastSignIn?: string | null;
  referral?: ProfileReferral | null;
  today: string;
}

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const GENDERS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "UNSAID", label: "Prefer not to say" },
] as const;
const HINT = "text-[12.5px] leading-[1.45]";
const PHONE_PREFIX = <span className="-ml-3 flex h-full items-center border-r border-line bg-strip px-2.75 text-body font-medium text-ink-2">+880</span>;

type Form = Record<Exclude<ProfileField, "phone2WhatsApp">, string> & {
  phone2WhatsApp: boolean;
};

const formOf = (user: ReturnType<typeof useAuth>["user"]): Form => ({
  name: user.name,
  occupation: user.occupation ?? "",
  dateOfBirth: user.dateOfBirth ?? "",
  gender: user.gender ?? "",
  district: user.district ?? "",
  address: user.address ?? "",
  phone: cleanLocalPhone(user.phone ?? ""),
  phone2: cleanLocalPhone(user.phone2 ?? ""),
  phone2WhatsApp: Boolean(user.phone2WhatsApp),
});

// The SettingsProfile board: the photo, the person's details and how to
// reach them, checked as they are typed, with a save bar that says what
// changed (and asks before a link leaves it unsaved) and a new number
// confirmed by SMS; beside it the account's facts, how complete the
// profile is and the referral code. The app's own shareable profile card
// (with its cover) follows the details.
export function ProfileSection({ lastSignIn = null, referral = null, today }: ProfileSectionProps) {
  const { t, locale, fmt } = useLocale();
  const { user } = useAuth();
  const plan = usePlanChip();
  const router = useRouter();
  const [form, setForm] = useState<Form>(() => formOf(user));
  const [justSaved, setJustSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const readOnly = Boolean(user.impersonatedBy);

  const photoInput = useRef<HTMLInputElement>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removing, startRemoving] = useTransition();
  const [coverOpen, setCoverOpen] = useState(false);

  // The new number's code, opened right after it is saved; or "Verify".
  const [phoneDialog, setPhoneDialog] = useState<"new" | "saved" | null>(null);
  const [newPhone, setNewPhone] = useState("");
  const confirmed = useRef(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [resent, setResent] = useState(false);
  const verify = useVerifyEmail(() => setInboxOpen(true));
  const resend = useVerifyEmail(() => setResent(true));

  // The form follows the account once a save lands; a verified email met
  // after "I've opened the link" says so.
  const [prevUser, setPrevUser] = useState(user);
  const awaitingEmail = useRef(false);
  const verified = user.emailVerified ?? Boolean(user.emailVerifiedAt);
  if (user !== prevUser) {
    setPrevUser(user);
    setForm(formOf(user));
  }
  useEffect(() => {
    if (!awaitingEmail.current || !verified) return;
    awaitingEmail.current = false;
    toast.success(t("Email verified"));
  }, [verified, t]);

  const saved = formOf(user);
  const tidy = (text: string) => text.replace(/[ \t]+/g, " ").trim();
  const changedOf = (key: ProfileField) => {
    if (key === "phone" || key === "phone2") return !samePhone(fullPhone(form[key]), (key === "phone" ? user.phone : user.phone2) ?? "");
    if (key === "phone2WhatsApp") return form.phone2WhatsApp !== saved.phone2WhatsApp;
    return tidy(form[key]) !== tidy(saved[key]);
  };
  const changed = (Object.keys(PROFILE_FIELD_LABELS) as ProfileField[]).filter(changedOf);
  const dirty = changed.length > 0;
  // A field is checked once changed, so an older value the rules didn't
  // know yet never blocks the others.
  const problems: Partial<Record<ProfileField, string | null>> = {
    name: changed.includes("name") ? nameProblem(form.name) : null,
    occupation: tidy(form.occupation).length > 40 ? "Keep it under 40 letters." : null,
    dateOfBirth: changed.includes("dateOfBirth") ? birthDateProblem(form.dateOfBirth, today) : null,
    address: tidy(form.address).length > 200 ? "Keep it under 200 letters." : null,
    phone: changed.includes("phone") ? phoneProblem(form.phone) : null,
    phone2: changed.includes("phone2") || changed.includes("phone") ? secondPhoneProblem(form.phone2, form.phone) : null,
  };
  const invalid = Object.values(problems).some(Boolean);
  const leave = useLeaveGuard(dirty && !isPending);

  const edit = <K extends keyof Form>(key: K, value: Form[K]) => {
    setJustSaved(false);
    setForm((now) => ({ ...now, [key]: value }));
  };

  function discard() {
    setForm(formOf(user));
    toast(t("Changes discarded"));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!dirty || invalid || isPending || readOnly) return;
    // Only what changed: a number kept as sign-up wrote it stays that way.
    const changes: UpdateProfileInput = {};
    for (const key of changed) {
      if (key === "phone" || key === "phone2") changes[key] = fullPhone(form[key]);
      else if (key === "phone2WhatsApp") changes.phone2WhatsApp = form.phone2WhatsApp;
      else if (key === "gender") changes.gender = form.gender as UpdateProfileInput["gender"];
      else changes[key] = tidy(form[key]);
    }
    if (changes.phone2 !== undefined && !changes.phone2) changes.phone2WhatsApp = false;
    const newNumber = changed.includes("phone") && Boolean(fullPhone(form.phone));
    startTransition(async () => {
      const result = await updateProfileAction(changes);
      if (!result.success) {
        toast.error(t(result.message ?? "Failed to update profile"));
        return;
      }
      setJustSaved(true);
      router.refresh();
      // A new number is confirmed by the code we text to it.
      if (newNumber) {
        confirmed.current = false;
        setNewPhone(form.phone);
        setPhoneDialog("new");
      } else {
        toast.success(t("Profile saved"));
      }
    });
  }

  function pickPhoto(file: File | undefined) {
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type) || file.size > PHOTO_MAX_BYTES) {
      toast.error(t(PHOTO_TYPES.includes(file.type) ? "Image must be 5MB or smaller" : "That file is not a photo we can use. Pick a JPG, PNG, WEBP or GIF."));
      return;
    }
    setCropFile(file);
  }

  // Put the earlier photo back (the toast's Undo).
  function undoPhoto(earlier: string | null, done: string) {
    void restoreAvatarAction(earlier).then((result) => {
      if (result.success) {
        toast.success(t(done));
        router.refresh();
      } else {
        toast.error(t(result.message ?? "Couldn't put the photo back"));
      }
    });
  }

  async function savePhoto(photo: File): Promise<boolean> {
    const earlier = user.avatarUrl;
    const body = new FormData();
    body.append("file", photo);
    const result = await uploadAvatarAction(body);
    if (!result.success) {
      toast.error(t(result.message ?? "Failed to upload avatar"));
      return false;
    }
    toast.success(t("Photo updated"), {
      action: {
        label: t("Undo"),
        onClick: () => undoPhoto(earlier, "Old photo is back"),
      },
    });
    router.refresh();
    return true;
  }

  function removePhoto() {
    const earlier = user.avatarUrl;
    startRemoving(async () => {
      const result = await removeAvatarAction();
      if (!result.success) {
        toast.error(t(result.message ?? "Couldn't remove the photo"));
        return;
      }
      setRemoveOpen(false);
      toast.success(
        t("Photo removed"),
        earlier
          ? {
              action: {
                label: t("Undo"),
                onClick: () => undoPhoto(earlier, "Photo is back"),
              },
            }
          : undefined,
      );
      router.refresh();
    });
  }

  function copy(text: string, done: string) {
    void navigator.clipboard
      .writeText(text)
      .then(() => toast.success(t(done)))
      .catch(() => toast.error(t("Couldn't copy. Select the text and copy it yourself.")));
  }

  // Jumps to a field the checklist names (the photo opens the picker; the
  // email sends its link).
  function goTo(check: ProfileCheck) {
    if (check === "photo") return photoInput.current?.click();
    if (check === "email") return user.emailReady === false || verify.sending ? document.getElementById("pf-email")?.focus() : verify.send();
    const id = {
      name: "pf-name",
      dateOfBirth: "pf-dob",
      gender: "pf-gender",
      occupation: "pf-job",
      district: "pf-district",
      address: "pf-address",
      phone: "pf-phone",
    }[check];
    const field = document.getElementById(id);
    field?.scrollIntoView({ block: "center", behavior: "smooth" });
    setTimeout(() => field?.focus({ preventScroll: true }), 350);
  }

  const savedPhone = Boolean(user.phone) && !changed.includes("phone");
  const phoneVerified = Boolean(user.phoneVerifiedAt);
  const status = t(
    saveBarText(changed, {
      invalid,
      saving: isPending,
      justSaved,
      phoneRemoved: !fullPhone(form.phone),
    }),
    { list: changed.map((key) => t(PROFILE_FIELD_LABELS[key])).join(", ") },
  );
  const supportLink = (
    <Link href="/settings/help" className="font-semibold text-emerald hover:underline">
      {t("contact support")}
    </Link>
  );
  const shownError = (key: ProfileField) => (problems[key] ? t(problems[key]) : undefined);
  const { percent, missing } = profileCompleteness({
    photo: Boolean(user.avatarUrl),
    name: Boolean(user.name),
    dateOfBirth: Boolean(user.dateOfBirth),
    gender: Boolean(user.gender),
    occupation: Boolean(user.occupation),
    district: Boolean(user.district),
    address: Boolean(user.address),
    phone: Boolean(user.phone),
    email: verified,
  });
  const facts = [
    {
      label: "Member since",
      value: user.createdAt ? formatDate(user.createdAt, "d MMMM yyyy", fmt) : "—",
    },
    {
      label: "User ID",
      value: user.customerCode ? toLocaleDigits(user.customerCode, fmt) : "—",
      copy: user.customerCode,
    },
    {
      label: "Last sign-in",
      value: lastSignIn ? formatRelativeDateTime(lastSignIn, { t, locale: fmt }) : "—",
      link: { label: "Devices", href: "/settings/security" },
    },
    {
      label: "Language",
      value: locale === "bn" ? "বাংলা" : "English",
      link: { label: "Change", href: "/settings/app" },
    },
  ];

  return (
    <PageFrame className="gap-5.5 leading-[normal]">
      <div className="flex flex-col gap-1">
        <SettingsBack />
        <h1 className="text-[26px] leading-[1.3] font-semibold tracking-[-0.02em] text-ink">{t("Profile")}</h1>
        <p className="text-body text-ink-muted">{t("Your personal details and how people in your groups can reach you.")}</p>
      </div>
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <form onSubmit={submit} noValidate className="@container flex min-w-0 flex-col gap-4.5">
          <section aria-labelledby="pf-personal" className={CARD}>
            <div className="flex flex-col gap-0.75 px-5.5 pt-4.5 pb-3.5">
              <h2 id="pf-personal" className="text-[16px] leading-[1.35] font-semibold text-ink">
                {t("Personal info")}
              </h2>
              <p className="text-small leading-normal text-ink-muted">{t("How you appear in Smartly and in the groups you run.")}</p>
            </div>
            <div className="flex flex-col gap-4 px-5.5 pb-5">
              <div className="flex flex-wrap items-center gap-4 border-b border-divider pb-4">
                <Avatar name={user.name} src={user.avatarUrl} size={64} tone="soft" alt="" className="tracking-wide" />
                <div className="flex min-w-0 flex-col gap-1.5">
                  <span className="text-body font-medium text-ink">{t("Profile photo")}</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <input
                      ref={photoInput}
                      type="file"
                      accept={PHOTO_TYPES.join(",")}
                      className="sr-only"
                      tabIndex={-1}
                      aria-hidden="true"
                      onChange={(event) => {
                        pickPhoto(event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                    <Button type="button" variant="secondary" size="sm" onClick={() => photoInput.current?.click()} disabled={readOnly} className="h-9.5 px-3.5 text-[13.5px] pointer-coarse:h-11">
                      <Camera className="size-3.75" />
                      {user.avatarUrl ? t("Change photo") : t("Add photo")}
                    </Button>
                    {user.avatarUrl && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setRemoveOpen(true)} disabled={readOnly} className="h-9.5 px-3 text-[13.5px] text-ink-2 pointer-coarse:h-11">
                        {t("Remove")}
                      </Button>
                    )}
                  </div>
                  <span className={cn(HINT, "text-ink-muted")}>{t("JPG, PNG, WEBP or GIF, up to 5 MB. A square photo looks best.")}</span>
                </div>
              </div>
              <div className="grid gap-x-4 gap-y-3.5 @xl:grid-cols-2">
                <Field htmlFor="pf-name" label={t("Full name")} hint={<span className={HINT}>{t("Shown on your groups, statements and invites.")}</span>} error={shownError("name")}>
                  <Input id="pf-name" size="md" className="text-[14.5px]" value={form.name} onChange={(event) => edit("name", event.target.value)} maxLength={120} autoComplete="name" required invalid={Boolean(problems.name)} readOnly={readOnly} />
                </Field>
                <Field htmlFor="pf-job" label={t("Occupation")} hint={<span className={HINT}>{t("Helps us suggest the right budget templates.")}</span>} error={shownError("occupation")}>
                  <Input
                    id="pf-job"
                    size="md"
                    className="text-[14.5px]"
                    value={form.occupation}
                    onChange={(event) => edit("occupation", event.target.value)}
                    maxLength={60}
                    autoComplete="organization-title"
                    placeholder={t("e.g. Teacher, Business owner")}
                    invalid={Boolean(problems.occupation)}
                    readOnly={readOnly}
                  />
                </Field>
              </div>
              <div className="grid gap-x-4 gap-y-3.5 @xl:grid-cols-3">
                <Field htmlFor="pf-dob" label={t("Date of birth")} hint={<span className={HINT}>{t("Only you can see this.")}</span>} error={shownError("dateOfBirth")}>
                  <DayInput id="pf-dob" size="md" value={form.dateOfBirth} max={today} min="1920-01-01" onChange={(value) => edit("dateOfBirth", value)} invalid={Boolean(problems.dateOfBirth)} placeholder={t("Pick a date")} />
                </Field>
                <Field htmlFor="pf-gender" label={t("Gender")} hint={<span className={HINT}>{t("Only you can see this.")}</span>}>
                  <select id="pf-gender" value={form.gender} disabled={readOnly} onChange={(event) => edit("gender", event.target.value)} className={cn(SELECT, "h-11 w-full rounded-field text-[14.5px]", !form.gender && "text-ink-faint")}>
                    <option value="">{t("Choose")}</option>
                    {GENDERS.map((gender) => (
                      <option key={gender.value} value={gender.value}>
                        {t(gender.label)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field htmlFor="pf-district" label={t("City or district")} hint={<span className={HINT}>{t("Used for local prices and Zakat nisab.")}</span>}>
                  <select id="pf-district" value={form.district} disabled={readOnly} onChange={(event) => edit("district", event.target.value)} className={cn(SELECT, "h-11 w-full rounded-field text-[14.5px]", !form.district && "text-ink-faint")}>
                    <option value="">{t("Choose your district")}</option>
                    {districtOptions(locale === "bn").map((district) => (
                      <option key={district.value} value={district.value}>
                        {district.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field
                htmlFor="pf-address"
                label={
                  <span>
                    {t("Address")} <span className="font-normal text-ink-muted">{t("(optional)")}</span>
                  </span>
                }
                hint={
                  <span className={cn(HINT, "flex justify-between gap-3")}>
                    <span>{t("Printed on PDF statements you download.")}</span>
                    <span className="tabular-nums">{toLocaleDigits(`${tidy(form.address).length}/200`, fmt)}</span>
                  </span>
                }
                error={shownError("address")}
              >
                <Textarea
                  id="pf-address"
                  rows={2}
                  className="min-h-16 text-[14.5px]"
                  value={form.address}
                  onChange={(event) => edit("address", event.target.value)}
                  maxLength={240}
                  autoComplete="street-address"
                  placeholder={t("House, road, area")}
                  invalid={Boolean(problems.address)}
                  readOnly={readOnly}
                />
              </Field>
            </div>
          </section>

          <section aria-labelledby="pf-contact" className={CARD}>
            <div className="flex flex-col gap-0.75 px-5.5 pt-4.5 pb-3.5">
              <h2 id="pf-contact" className="text-[16px] leading-[1.35] font-semibold text-ink">
                {t("Contact")}
              </h2>
              <p className="text-small leading-normal text-ink-muted">{t("Used for sign-in, receipts and withdrawal codes. We never share them.")}</p>
            </div>
            <div className="flex flex-col gap-4 px-5.5 pb-5">
              <Field
                htmlFor="pf-email"
                className="border-b border-divider pb-4"
                label={
                  <span className="flex items-center gap-2">
                    {t("Email")}
                    <span className={cn("inline-flex h-4.5 items-center rounded-full px-2 text-[11px] font-semibold", verified ? "bg-income-soft text-income" : "bg-warning-soft text-warning-ink")}>{verified ? t("Verified") : t("Not verified")}</span>
                  </span>
                }
                hint={
                  <span className={HINT} aria-live="polite">
                    {verified ? (
                      <>
                        {t("to change it,")} {supportLink}
                      </>
                    ) : user.emailReady === false ? (
                      <>
                        {t("Email isn't set up on Smartly yet.")} {t("to change it,")} {supportLink}
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={verify.send} disabled={verify.sending || readOnly} className="inline-flex items-center gap-1 font-semibold text-emerald hover:underline disabled:opacity-60 pointer-coarse:min-h-11">
                          {verify.sending && <Loader size={12} />}
                          {verify.sentTo ? t("Resend the verification email") : t("Send a verification email")}
                        </button>
                        {" · "}
                        {t("to change it,")} {supportLink}
                      </>
                    )}
                  </span>
                }
              >
                <Input
                  id="pf-email"
                  size="md"
                  value={user.email}
                  readOnly
                  className="text-[14.5px] text-ink-soft"
                  frameClassName="border-line bg-strip"
                  trailing={<Lock className="size-3.75 text-ink-faint" aria-label={t("To change your email, contact support")} />}
                />
              </Field>
              <div className="grid gap-x-4 gap-y-3.5 @xl:grid-cols-2">
                <Field
                  htmlFor="pf-phone"
                  label={
                    <span className="flex items-center gap-2">
                      {t("Phone")}
                      {savedPhone && (
                        <span className={cn("inline-flex h-4.5 items-center rounded-full px-2 text-[11px] font-semibold", phoneVerified ? "bg-income-soft text-income" : "bg-warning-soft text-warning-ink")}>
                          {phoneVerified ? t("Verified") : t("Not verified")}
                        </span>
                      )}
                    </span>
                  }
                  error={shownError("phone")}
                  hint={
                    <span className={HINT}>
                      {savedPhone && !phoneVerified ? (
                        <>
                          <button type="button" onClick={() => setPhoneDialog("saved")} disabled={readOnly} className="font-semibold text-emerald hover:underline disabled:opacity-60 pointer-coarse:min-h-11">
                            {t("Verify by SMS")}
                          </button>
                          {" · "}
                          {t("to get codes by SMS and reset your password with it.")}
                        </>
                      ) : changed.includes("phone") && form.phone ? (
                        t("When you save, we text a code to confirm the new number.")
                      ) : !form.phone ? (
                        t("No number added. You need one to withdraw referral money.")
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
                    value={form.phone}
                    onChange={(event) => edit("phone", cleanLocalPhone(event.target.value))}
                    placeholder="1XXX-XXXXXX"
                    leading={PHONE_PREFIX}
                    trailing={
                      form.phone && !readOnly ? (
                        <button type="button" onClick={() => edit("phone", "")} aria-label={t("Clear phone number")} className="-mr-1.5 flex size-7 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink">
                          <X className="size-3.75" aria-hidden="true" />
                        </button>
                      ) : undefined
                    }
                    className="text-[14.5px] tabular-nums"
                    autoComplete="tel-national"
                    invalid={Boolean(problems.phone)}
                    readOnly={readOnly}
                  />
                </Field>
                <div className="flex flex-col gap-2">
                  <Field
                    htmlFor="pf-phone2"
                    label={
                      <span>
                        {t("Second phone or WhatsApp")} <span className="font-normal text-ink-muted">{t("(optional)")}</span>
                      </span>
                    }
                    error={shownError("phone2")}
                    hint={<span className={HINT}>{t("Used when your main number is off.")}</span>}
                  >
                    <Input
                      id="pf-phone2"
                      size="md"
                      type="tel"
                      inputMode="tel"
                      value={form.phone2}
                      onChange={(event) => edit("phone2", cleanLocalPhone(event.target.value))}
                      placeholder="1XXX-XXXXXX"
                      leading={PHONE_PREFIX}
                      trailing={
                        form.phone2 && !readOnly ? (
                          <button type="button" onClick={() => edit("phone2", "")} aria-label={t("Clear second number")} className="-mr-1.5 flex size-7 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink">
                            <X className="size-3.75" aria-hidden="true" />
                          </button>
                        ) : undefined
                      }
                      className="text-[14.5px] tabular-nums"
                      autoComplete="off"
                      invalid={Boolean(problems.phone2)}
                      readOnly={readOnly}
                    />
                  </Field>
                  <label className={cn("flex w-fit items-center gap-2 text-[13px] text-ink-2", (!form.phone2 || readOnly) && "opacity-50")}>
                    <input type="checkbox" className="size-4 accent-primary" checked={form.phone2WhatsApp && Boolean(form.phone2)} disabled={!form.phone2 || readOnly} onChange={(event) => edit("phone2WhatsApp", event.target.checked)} />
                    {t("This number has WhatsApp")}
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* Amber while there is something to save, green just after. */}
          <div className={cn(CARD, "flex flex-wrap items-center justify-end gap-2.5 px-5.5 py-3.5", dirty && !isPending && "bg-warning-50")}>
            <span role="status" className={cn("flex w-full min-w-0 items-center gap-2 text-[13px] @lg:w-auto @lg:flex-1", invalid ? "font-semibold text-expense" : dirty ? "font-semibold text-warning-ink" : "text-ink-muted")}>
              <span aria-hidden="true" className={cn("size-1.75 shrink-0 rounded-full", invalid ? "bg-expense-fill" : dirty ? "bg-warning-fill" : justSaved ? "bg-emerald" : "bg-input")} />
              {status}
            </span>
            <Button type="button" variant="secondary" onClick={discard} disabled={!dirty || isPending} className="px-3.5 pointer-coarse:h-11">
              {t("Discard")}
            </Button>
            <Button type="submit" disabled={!dirty || invalid || isPending || readOnly} className="min-w-33 px-4.5 pointer-coarse:h-11">
              {isPending && <Loader />}
              {isPending ? t("Saving") : t("Save changes")}
            </Button>
          </div>

          <ProfileCardShare onCover={() => setCoverOpen(true)} />
        </form>

        <div className="flex flex-col gap-4 xl:sticky xl:top-4">
          <section aria-label={t("Your account")} className={cn(CARD, "overflow-hidden")}>
            <div className="flex flex-col gap-3.5 px-5 pt-4.5 pb-4">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={user.name} src={user.avatarUrl} size={52} tone="soft" alt="" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[16px] font-semibold text-ink">{user.name}</span>
                  <span className="truncate text-[12.5px] text-ink-muted">{user.email}</span>
                </span>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl border border-line-card bg-strip px-3 py-2.5">
                <Crown className="size-4 shrink-0 text-ink-soft" aria-hidden="true" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[11.5px] text-ink-muted">{t("Your plan")}</span>
                  <span className="truncate text-body font-semibold text-ink">{plan.status === "free" ? t("Free") : plan.label}</span>
                </span>
                <Link href={PLANS_ROUTE} className="text-small font-semibold text-emerald hover:underline">
                  {t(plan.status === "paid" ? "Manage plan" : "See plans")}
                </Link>
              </div>
              <dl className="flex flex-col">
                {facts.map((fact, index) => (
                  <div key={fact.label} className={cn("flex items-center justify-between gap-3 py-2.5", index > 0 && "border-t border-divider")}>
                    <dt className="text-small text-ink-muted">{t(fact.label)}</dt>
                    <dd className="flex min-w-0 items-center gap-2 text-small font-semibold text-ink">
                      <span className="truncate">{fact.value}</span>
                      {fact.copy && (
                        <button
                          type="button"
                          onClick={() => copy(fact.copy!, "User ID copied")}
                          aria-label={t("Copy user ID")}
                          className="flex size-7 items-center justify-center rounded-lg border border-line text-ink-muted hover:bg-surface-sunken hover:text-ink"
                        >
                          <Copy className="size-3.5" aria-hidden="true" />
                        </button>
                      )}
                      {fact.link && (
                        <Link href={fact.link.href} className="text-[12.5px] font-semibold text-emerald hover:underline">
                          {t(fact.link.label)}
                        </Link>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="flex flex-col gap-2.5 border-t border-divider px-5 pt-4 pb-4.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-body font-semibold text-ink">{t("Profile complete")}</span>
                <span className={cn("text-[17px] font-bold tabular-nums", percent === 100 ? "text-income" : "text-warning")}>{toLocaleDigits(`${percent}%`, fmt)}</span>
              </div>
              <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={t("Profile complete")} className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                <div className={cn("h-full rounded-full", percent === 100 ? "bg-income" : "bg-warning")} style={{ width: `${percent}%` }} />
              </div>
              {missing.length === 0 ? (
                <span className="flex items-center gap-1.5 text-[12.5px] text-income">
                  <Check className="size-3.5" aria-hidden="true" />
                  {t("Everything is filled in.")}
                </span>
              ) : (
                <>
                  <span className="text-[12.5px] text-ink-muted">
                    {t("{count} left to add. Tap one to jump to it.", {
                      count: formatCount(missing.length, fmt),
                    })}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {missing.map((check) => (
                      <button
                        key={check.key}
                        type="button"
                        onClick={() => goTo(check.key)}
                        disabled={readOnly}
                        className="inline-flex h-7.5 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 text-[12.5px] font-medium text-ink-2 hover:border-primary hover:text-ink disabled:opacity-60"
                      >
                        <span aria-hidden="true" className="size-3 rounded-full border-[1.5px] border-dashed border-warning" />
                        {t(check.label)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>

          {referral && (
            <section aria-labelledby="pf-ref" className={cn(CARD, "flex flex-col gap-3 px-5 py-4.5")}>
              <h2 id="pf-ref" className="text-[16px] leading-[1.35] font-semibold text-ink">
                {t("Your referral code")}
              </h2>
              <p className="text-small leading-normal text-ink-muted">
                {t("Friends get {discount}% off their first payment. You get {commission}% of every payment they make.", {
                  discount: formatCount(referral.friendDiscountPct, fmt),
                  commission: formatCount(referral.commissionPct, fmt),
                })}
              </p>
              <div className="flex items-center gap-2 rounded-xl border border-dashed border-mint-200 bg-mint-50/50 py-1.5 pr-1.5 pl-3.5">
                <span className="min-w-0 flex-1 truncate font-mono text-[16px] font-bold tracking-[0.12em] text-brand-ink">{referral.code}</span>
                <Button type="button" size="sm" className="h-8.5 px-3 text-small" onClick={() => copy(referral.code, "Code copied")}>
                  <Copy className="size-3.5" aria-hidden="true" />
                  {t("Copy")}
                </Button>
              </div>
              <Link href="/referrals" className="w-fit text-small font-semibold text-emerald hover:underline">
                {t("See your referrals")}
              </Link>
            </section>
          )}
        </div>
      </div>

      <PhotoCropDialog file={cropFile} onClose={() => setCropFile(null)} onPickAnother={() => photoInput.current?.click()} onSave={savePhoto} />
      <RemovePhotoDialog open={removeOpen} name={user.name} photo={user.avatarUrl} busy={removing} onClose={() => setRemoveOpen(false)} onRemove={removePhoto} />
      <ChangePhotoDialog kind="cover" open={coverOpen} onClose={() => setCoverOpen(false)} />
      <VerifyPhoneDialog
        open={phoneDialog !== null}
        phone={`+880 ${phoneDialog === "new" ? newPhone : cleanLocalPhone(user.phone ?? "")}`}
        title={phoneDialog === "new" ? t("Confirm your new number") : undefined}
        doneMessage={phoneDialog === "new" ? t("Number confirmed and profile saved") : undefined}
        onClose={() => {
          // Saved but not confirmed yet: the profile still says so.
          if (phoneDialog === "new" && !confirmed.current) toast.success(t("Profile saved"));
          setPhoneDialog(null);
        }}
        onVerified={() => {
          confirmed.current = true;
          router.refresh();
        }}
      />
      <CheckInboxDialog
        open={inboxOpen}
        email={verify.sentTo ?? user.email}
        resending={resend.sending}
        resent={resent}
        onOpened={() => {
          setInboxOpen(false);
          awaitingEmail.current = true;
          router.refresh();
        }}
        onResend={resend.send}
        onClose={() => setInboxOpen(false)}
      />
      <LeaveDialog open={leave.pending !== null} onStay={leave.stay} onLeave={leave.leave} />
    </PageFrame>
  );
}
