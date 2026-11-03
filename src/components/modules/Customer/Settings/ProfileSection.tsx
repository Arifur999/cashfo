"use client";

import { Camera, Lock, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { usePlanChip } from "@/components/modules/Customer/Providers/PlanProvider";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import Loader from "@/components/shared/Loader";
import Avatar from "@/components/smartly/Avatar";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { removeAvatarAction, restoreAvatarAction, updateProfileAction, uploadAvatarAction } from "@/lib/customer/authActions";
import { formatDate } from "@/lib/customer/date";
import { PLANS_ROUTE } from "@/lib/customer/nav";
import { nameProblem, phoneProblem, saveBarText } from "@/lib/customer/profileRules";
import { cleanLocalPhone, fullPhone, samePhone } from "@/lib/customer/settingsDisplay";
import { formatRelativeDateTime } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { ChangePhotoDialog } from "./ChangePhotoDialog";
import { PhotoCropDialog } from "./PhotoCropDialog";
import { COVER_FALLBACK } from "./ProfileCard";
import { ProfileCardShare } from "./ProfileCardShare";
import { CheckInboxDialog, LeaveDialog, RemovePhotoDialog } from "./ProfileDialogs";
import { useLeaveGuard } from "./useLeaveGuard";
import { useVerifyEmail } from "./useVerifyEmail";
import { VerifyPhoneDialog } from "./VerifyPhoneDialog";

interface ProfileSectionProps {
  // The newest successful sign-in (the history's), for "Last sign-in";
  // null when it couldn't be read.
  lastSignIn?: string | null;
}

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

// Who you are in Smartly (SettingsProfile board, with the app's cover,
// address and profile card): the photo -- framed before it is saved, taken
// off with a word first, either undone from the toast -- then name and
// email, phone and address checked as you type, a save bar that says what
// changed (and asks before a link leaves it unsaved), a new number
// confirmed by SMS; the account's facts; and the shareable profile card.
export function ProfileSection({ lastSignIn = null }: ProfileSectionProps) {
  const { t, locale, fmt } = useLocale();
  const { user } = useAuth();
  const plan = usePlanChip();
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(cleanLocalPhone(user.phone ?? ""));
  const [address, setAddress] = useState(user.address ?? "");
  const [justSaved, setJustSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const readOnly = Boolean(user.impersonatedBy);

  // The photo: a file being framed, the remove question, the cover dialog.
  const photoInput = useRef<HTMLInputElement>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removing, startRemoving] = useTransition();
  const [coverOpen, setCoverOpen] = useState(false);

  // The new number's code, opened right after it is saved; or "Verify".
  const [phoneDialog, setPhoneDialog] = useState<"new" | "saved" | null>(null);
  // The number just saved (the account may not have it yet), and whether
  // its code was confirmed before the dialog closed.
  const [newPhone, setNewPhone] = useState("");
  const confirmed = useRef(false);
  // "Check your inbox", and its resend.
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
    setName(user.name);
    setPhone(cleanLocalPhone(user.phone ?? ""));
    setAddress(user.address ?? "");
  }
  useEffect(() => {
    if (!awaitingEmail.current || !verified) return;
    awaitingEmail.current = false;
    toast.success(t("Email verified"));
  }, [verified, t]);

  const nameChanged = name.trim() !== user.name;
  // Sign-up keeps a number as typed ("01711-482915", "+880 1711 482915"), so
  // the field and the account are compared as numbers, not as text: an
  // untouched form is never "changed".
  const phoneChanged = !samePhone(fullPhone(phone), user.phone ?? "");
  const addressChanged = address.trim() !== (user.address ?? "");
  const dirty = nameChanged || phoneChanged || addressChanged;
  // Checked only once changed, so an older name the rules didn't know yet
  // never blocks the other fields.
  const nameError = nameChanged ? nameProblem(name) : null;
  const phoneError = phoneChanged ? phoneProblem(phone) : null;
  const invalid = Boolean(nameError || phoneError);
  const leave = useLeaveGuard(dirty && !isPending);

  function edit(apply: () => void) {
    setJustSaved(false);
    apply();
  }

  function discard() {
    setName(user.name);
    setPhone(cleanLocalPhone(user.phone ?? ""));
    setAddress(user.address ?? "");
    toast(t("Changes discarded"));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!dirty || invalid || isPending || readOnly) return;
    // Only what changed: a number kept as sign-up wrote it stays that way.
    const changes = { ...(nameChanged && { name: name.trim() }), ...(phoneChanged && { phone: fullPhone(phone) }), ...(addressChanged && { address: address.trim() }) };
    const newNumber = phoneChanged && Boolean(fullPhone(phone));
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
        setNewPhone(phone);
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
    toast.success(t("Photo updated"), { action: { label: t("Undo"), onClick: () => undoPhoto(earlier, "Old photo is back") } });
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
      toast.success(t("Photo removed"), earlier ? { action: { label: t("Undo"), onClick: () => undoPhoto(earlier, "Photo is back") } } : undefined);
      router.refresh();
    });
  }

  // The saved number's state; nothing while the field holds an unsaved one.
  const savedPhone = Boolean(user.phone) && !phoneChanged;
  const phoneVerified = Boolean(user.phoneVerifiedAt);
  const facts: { label: string; value: string; link?: { label: string; href: string } }[] = [
    { label: t("Member since"), value: user.createdAt ? formatDate(user.createdAt, "MMMM yyyy", fmt) : "—" },
    { label: t("Last sign-in"), value: lastSignIn ? formatRelativeDateTime(lastSignIn, { t, locale: fmt }) : "—", link: { label: t("See devices"), href: "/settings/security" } },
    { label: t("Plan"), value: plan.status === "free" ? t("Free") : plan.label, link: { label: plan.status === "paid" ? t("Manage plan") : t("See plans"), href: PLANS_ROUTE } },
    { label: t("Language"), value: locale === "bn" ? "বাংলা" : "English", link: { label: t("Change in App preferences"), href: "/settings/app" } },
  ];
  const changedCount = [nameChanged, phoneChanged, addressChanged].filter(Boolean).length;
  const status = t(saveBarText({ name: nameChanged, phone: phoneChanged, phoneRemoved: phoneChanged && !fullPhone(phone), address: addressChanged }, { invalid, saving: isPending, justSaved }), {
    count: formatCount(changedCount, fmt),
  });
  const supportLink = (
    <Link href="/settings/help" className="font-semibold text-emerald hover:underline">
      {t("contact support")}
    </Link>
  );
  const buttonTone = "pointer-coarse:h-11";

  return (
    <div className="flex flex-col gap-5">
      <Card padding="none" className="overflow-hidden">
        <form onSubmit={submit} noValidate>
          {/* The cover, its button in the corner; the photo over its edge. */}
          <div className={cn("relative h-36 bg-cover bg-center @lg:h-44", !user.coverUrl && COVER_FALLBACK)} style={user.coverUrl ? { backgroundImage: `url("${user.coverUrl}")` } : undefined}>
            <Button type="button" variant="secondary" size="sm" onClick={() => setCoverOpen(true)} disabled={readOnly} className="absolute top-3 right-3 border-0 bg-surface/90 px-3 text-[13px] shadow-sm backdrop-blur-sm pointer-coarse:h-11">
              <Camera className="size-3.75 text-ink-soft" />
              {t(user.coverUrl ? "Change cover" : "Add a cover")}
            </Button>
          </div>
          <div className="flex flex-wrap items-end gap-x-4.5 gap-y-3 px-6">
            <div className="relative -mt-11 shrink-0">
              <Avatar name={user.name} src={user.avatarUrl} size={88} tone="soft" alt="" className="tracking-wide ring-4 ring-surface" />
              <button type="button" onClick={() => photoInput.current?.click()} disabled={readOnly} aria-label={t("Change photo")} title={t("Change photo")} className="absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full border-2 border-surface bg-primary text-primary-foreground hover:bg-emerald-hover disabled:opacity-60 pointer-coarse:size-11">
                <Camera className="size-3.75" aria-hidden="true" />
              </button>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 pb-1">
              <h2 className="truncate text-h3 text-ink">{user.name}</h2>
              <span className="text-[13.5px] text-ink-muted">{t("How you appear in Smartly and in the groups you run.")}</span>
            </div>
            <div className="flex flex-col items-start gap-1.5 pb-1 @lg:items-end">
              <div className="flex items-center gap-1">
                <input ref={photoInput} type="file" accept={PHOTO_TYPES.join(",")} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(event) => {
                  pickPhoto(event.target.files?.[0]);
                  event.target.value = "";
                }} />
                <Button type="button" variant="secondary" size="sm" onClick={() => photoInput.current?.click()} disabled={readOnly} className={cn("h-9.5 rounded-full px-3.5 text-[14px]", buttonTone)}>
                  <Camera className="size-4" />
                  {user.avatarUrl ? t("Change photo") : t("Add photo")}
                </Button>
                {user.avatarUrl && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setRemoveOpen(true)} disabled={readOnly} className={cn("h-9.5 rounded-full px-3 text-[14px] text-ink-2", buttonTone)}>
                    {t("Remove")}
                  </Button>
                )}
              </div>
              <span className="text-[12.5px] text-ink-muted">{t("JPG, PNG, WEBP or GIF, up to 5 MB. A square photo looks best.")}</span>
            </div>
          </div>
          <div className="flex flex-col gap-4.5 px-6 py-5">
            <div className="grid gap-3.5 @lg:grid-cols-2">
              <Field htmlFor="pf-name" label={t("Full name")} hint={<span className="text-[12.5px]">{t("Shown on your groups, statements and invites.")}</span>} error={nameError ? t(nameError) : undefined}>
                <Input id="pf-name" size="md" className="text-[14.5px]" value={name} onChange={(event) => edit(() => setName(event.target.value))} maxLength={120} autoComplete="name" required invalid={Boolean(nameError)} readOnly={readOnly} />
              </Field>
              <Field
                htmlFor="pf-email"
                label={
                  <span className="flex items-center gap-2">
                    {t("Email")}
                    <Chip tone={verified ? "income" : "warning"} size="sm" className="h-4.5 px-2 text-[11.5px]">
                      {verified ? t("Verified") : t("Not verified")}
                    </Chip>
                  </span>
                }
                hint={
                  <span className="text-[12.5px]" aria-live="polite">
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
                  aria-describedby="pf-email-hint"
                  className="text-[14.5px] text-ink-soft"
                  frameClassName="border-line bg-strip"
                  trailing={<Lock className="size-3.75 text-ink-faint" aria-label={t("To change your email, contact support")} />}
                />
              </Field>
              <Field
                htmlFor="pf-phone"
                label={
                  <span className="flex items-center gap-2">
                    <span>
                      {t("Phone")} <span className="font-normal text-ink-muted">{t("(optional)")}</span>
                    </span>
                    {savedPhone && (
                      <Chip tone={phoneVerified ? "income" : "warning"} size="sm" className="h-4.5 px-2 text-[11.5px]">
                        {phoneVerified ? t("Verified") : t("Not verified")}
                      </Chip>
                    )}
                  </span>
                }
                error={phoneError ? t(phoneError) : undefined}
                hint={
                  <span className="text-[12.5px]">
                    {savedPhone && phoneVerified ? (
                      t("Codes come here by SMS. You can reset your password with it too.")
                    ) : savedPhone ? (
                      <>
                        <button type="button" onClick={() => setPhoneDialog("saved")} disabled={readOnly} className="font-semibold text-emerald hover:underline disabled:opacity-60 pointer-coarse:min-h-11">
                          {t("Verify by SMS")}
                        </button>
                        {" · "}
                        {t("to get codes by SMS and reset your password with it.")}
                      </>
                    ) : phoneChanged && phone ? (
                      t("When you save, we text a code to confirm the new number.")
                    ) : !phone ? (
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
                  value={phone}
                  // Bangla digits work, and a whole number pasted with its
                  // +880 or 0 keeps only the part after the box's +880.
                  onChange={(event) => edit(() => setPhone(cleanLocalPhone(event.target.value)))}
                  placeholder="1XXX-XXXXXX"
                  leading={<span className="-ml-3 flex h-full items-center border-r border-line bg-strip px-2.5 text-body font-medium text-ink-2">+880</span>}
                  trailing={
                    phone && !readOnly ? (
                      <button type="button" onClick={() => edit(() => setPhone(""))} aria-label={t("Clear phone number")} className="-mr-1.5 flex size-7 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink">
                        <X className="size-3.75" aria-hidden="true" />
                      </button>
                    ) : undefined
                  }
                  aria-describedby="pf-phone-hint"
                  className="text-[14.5px] tabular-nums"
                  autoComplete="tel-national"
                  invalid={Boolean(phoneError)}
                  readOnly={readOnly}
                />
              </Field>
              <Field htmlFor="pf-address" label={<span>{t("Address")} <span className="font-normal text-ink-muted">{t("(optional)")}</span></span>} hint={<span className="text-[12.5px]">{t("Only you see it. It is never on your profile card.")}</span>}>
                <Input id="pf-address" size="md" className="text-[14.5px]" value={address} onChange={(event) => edit(() => setAddress(event.target.value))} maxLength={200} autoComplete="street-address" placeholder={t("House 12, Road 5, Dhanmondi, Dhaka")} aria-describedby="pf-address-hint" readOnly={readOnly} />
              </Field>
            </div>
          </div>
          {/* The sentence takes the whole line on a narrow card, the buttons
              go under it on the right. Amber while there is something to
              save, green just after a save. */}
          <div className={cn("flex flex-wrap items-center justify-end gap-2.5 border-t border-divider px-6 py-3.5", dirty && !isPending ? "bg-warning-50" : "bg-strip")}>
            <span
              role="status"
              className={cn(
                "flex w-full min-w-0 items-center gap-2 text-[13px] @lg:w-auto @lg:flex-1",
                invalid ? "font-semibold text-expense" : dirty ? "font-semibold text-warning-ink" : "text-ink-muted",
              )}
            >
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
        </form>
      </Card>

      <Card padding="none" className="flex flex-col gap-3 px-6 py-4.5">
        <h2 className="text-title font-semibold text-ink">{t("Your account")}</h2>
        <dl className="grid gap-3 @md:grid-cols-2 @2xl:grid-cols-4">
          {facts.map((fact) => (
            <div key={fact.label} className="flex flex-col gap-0.75">
              <dt className="text-[12.5px] text-ink-muted">{fact.label}</dt>
              <dd className="text-body font-medium text-ink">{fact.value}</dd>
              {fact.link && (
                <dd>
                  <Link href={fact.link.href} className="text-[12.5px] font-semibold text-emerald hover:underline">
                    {fact.link.label}
                  </Link>
                </dd>
              )}
            </div>
          ))}
        </dl>
      </Card>

      <ProfileCardShare />

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
    </div>
  );
}
