"use client";

import { Info, Sparkles, Star, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Banner from "@/components/smartly/Banner";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import Textarea from "@/components/smartly/form/Textarea";
import { SOFT_TONE } from "@/components/smartly/tones";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { VaultEntrySummary } from "@/lib/customer/api";
import { createVaultEntryAction, updateVaultEntryAction } from "@/lib/customer/passwordVaultActions";
import { draftProblems, entryInput, isLockedMessage, passwordDetail, settle, type EntryDraft } from "@/lib/customer/vaultDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PasswordField } from "@/components/modules/Customer/Shared/PasswordField";
import { StrengthMeter } from "@/components/modules/Customer/Shared/StrengthMeter";
import { copyText } from "./clipboard";
import { firstGenerated, PasswordGenerator } from "./PasswordGenerator";
import { VAULT_CATEGORIES, VAULT_CATEGORY_ICONS, VAULT_CATEGORY_LABELS, VAULT_CATEGORY_TONE } from "./vaultCategoryDisplay";

interface EntryDrawerProps {
  open: boolean;
  // What the drawer holds. The page keeps it (and keeps it through a lock),
  // so it stays after closing too, for the closing slide.
  draft: EntryDraft | null;
  token: string;
  onChange: (draft: EntryDraft) => void;
  onClose: () => void;
  onSaved: (entry: VaultEntrySummary) => void;
  // The session ended: the page locks, keeping the draft for the next unlock.
  onLocked: () => void;
}

// Add or edit a login: category, where it is, the username, a password you
// type or generate (any length: a bKash PIN has 5 digits), and notes.
export function EntryDrawer({ open, draft, token, onChange, onClose, onSaved, onLocked }: EntryDrawerProps) {
  const { t, locale } = useLocale();
  const wide = useMediaQuery("(min-width: 768px)");
  const [generatorOpen, setGeneratorOpen] = useState(false);
  // The password reads as text on its eye, and whenever Generate fills it,
  // so a new password shows in the open.
  const [shown, setShown] = useState(false);
  // A save was tried with something missing: the fields say what.
  const [tried, setTried] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Every opening starts with the generator folded and no errors.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setGeneratorOpen(false);
      setTried(false);
      setShown(false);
    }
  }

  if (!draft) return null;

  const editing = draft.editing;
  const set = (patch: Partial<EntryDraft>) => onChange({ ...draft, ...patch });
  const problems = draftProblems(draft);
  const titleError = tried && problems.title ? t(problems.title) : undefined;
  const passwordError = tried && problems.password ? t(problems.password) : undefined;
  const detail = passwordDetail(draft.password);
  // 16px text on phones, so focusing a field doesn't zoom the page.
  const size = wide ? "md" : "xl";

  function copyPassword() {
    if (!draft) return;
    void copyText(draft.password).then((copied) => (copied ? toast.success(t("Password copied")) : toast.error(t("Couldn't copy. Select the text and copy it yourself."))));
  }

  function toggleGenerator() {
    // Opening it makes a password straight away when none is typed yet.
    if (!generatorOpen && draft && draft.password === "") {
      set({ password: firstGenerated() });
      setShown(true);
    }
    setGeneratorOpen(!generatorOpen);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (isPending || !draft) return;
    if (problems.title || problems.password) {
      setTried(true);
      document.getElementById(problems.title ? "ve-title" : "ve-pass")?.focus();
      return;
    }
    const saving = draft;
    startTransition(async () => {
      const input = entryInput(saving);
      const result = await settle(saving.editing ? updateVaultEntryAction(token, saving.editing.id, input) : createVaultEntryAction(token, input));
      if (result.success && result.data) {
        toast.success(t(saving.editing ? "Login updated" : "Login saved"));
        onSaved(result.data);
        onClose();
      } else if (isLockedMessage(result.message)) {
        onLocked();
      } else {
        toast.error(t(result.message ?? "Failed to save entry"));
      }
    });
  }

  const label = (text: string, optional = false) => (
    <span className="text-body font-medium text-ink">
      {text}
      {optional && <span className="font-normal text-ink-muted"> ({t("optional")})</span>}
    </span>
  );

  return (
    <Sheet open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <SheetContent side={wide ? "right" : "bottom"} showCloseButton={false} aria-describedby={undefined} className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? "w-125 shadow-drawer data-[side=right]:sm:max-w-125" : "rounded-t-xl data-[side=bottom]:h-[92vh]")}>
        <SheetHeader className={cn("flex-row items-center justify-between gap-3 space-y-0", wide ? "border-b border-line px-6 py-4" : "px-4 pt-4 pb-2")}>
          <SheetTitle className="text-h3 text-ink">{editing ? t("Edit login") : t("Add login")}</SheetTitle>
          <button type="button" onClick={onClose} disabled={isPending} aria-label={t("Close")} className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken pointer-coarse:size-11">
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </SheetHeader>

        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col" autoComplete="off">
          <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto", wide ? "px-6 py-4" : "px-4 py-3")}>
            {draft.kept && (
              <Banner inline tone="mint" icon={<Info />}>
                {t("We kept the login you were editing.")}
              </Banner>
            )}

            {/* Real radios: Tab reaches the picked one, arrows move along. */}
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-body font-medium text-ink">{t("Category")}</legend>
              <div className="flex flex-wrap gap-2">
                {VAULT_CATEGORIES.map((value) => {
                  const Icon = VAULT_CATEGORY_ICONS[value];
                  const on = value === draft.category;
                  return (
                    <label
                      key={value}
                      className={cn(
                        "flex h-7.5 cursor-pointer items-center gap-2 rounded-full border py-0 pr-3 pl-2 text-small text-ink pointer-coarse:h-11",
                        "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus-ring",
                        on ? "border-[1.5px] border-emerald bg-mint-50 font-bold" : "border-line bg-surface font-medium hover:border-line-strong",
                      )}
                    >
                      <input type="radio" name="vault-category" value={value} checked={on} onChange={() => set({ category: value })} className="sr-only" />
                      <span aria-hidden="true" className={cn("flex size-5 items-center justify-center rounded-full [&_svg]:size-3", SOFT_TONE[VAULT_CATEGORY_TONE[value]])}>
                        <Icon />
                      </span>
                      {t(VAULT_CATEGORY_LABELS[value])}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field htmlFor="ve-title" label={label(t("Title"))} error={titleError}>
                <Input
                  id="ve-title"
                  size={size}
                  value={draft.title}
                  onChange={(event) => set({ title: event.target.value })}
                  invalid={!!titleError}
                  maxLength={120}
                  autoFocus
                  placeholder={t("e.g. Facebook, Dutch Bangla Bank")}
                  autoComplete="off"
                  name="vault-title"
                  trailing={
                    <button type="button" onClick={() => set({ favorite: !draft.favorite })} aria-pressed={draft.favorite} aria-label={t(draft.favorite ? "Remove from favorites" : "Add to favorites")} title={t(draft.favorite ? "Remove from favorites" : "Add to favorites")} className="flex size-8 items-center justify-center rounded-sm hover:bg-surface-sunken pointer-coarse:size-11">
                      <Star className={cn("size-4.5", draft.favorite ? "fill-warning-fill text-warning-fill" : "text-ink-muted")} aria-hidden="true" />
                    </button>
                  }
                />
              </Field>
              <Field htmlFor="ve-site" label={label(t("Website"), true)}>
                <Input id="ve-site" size={size} type="text" inputMode="url" value={draft.website} onChange={(event) => set({ website: event.target.value })} maxLength={200} placeholder="rokomari.com" autoComplete="off" name="vault-site" />
              </Field>
            </div>
            <Field htmlFor="ve-user" label={label(t("Username or email"), true)}>
              <Input id="ve-user" size={size} value={draft.username} onChange={(event) => set({ username: event.target.value })} maxLength={200} autoComplete="off" name="vault-user" />
            </Field>

            {/* On an edit, a typed or generated password replaces the saved one for good: the hint says so. */}
            <Field htmlFor="ve-pass" label={label(t("Password"))} hint={editing ? t(draft.password ? "Saving replaces the current password." : "Leave blank to keep the current password.") : undefined} error={passwordError}>
              <div className="flex gap-2">
                <PasswordField
                  id="ve-pass"
                  size={size}
                  value={draft.password}
                  onChange={(password) => set({ password })}
                  invalid={!!passwordError}
                  aria-describedby={passwordError ? "ve-pass-error" : editing ? "ve-pass-hint" : undefined}
                  mono
                  visible={shown}
                  onVisibleChange={setShown}
                  onCopy={draft.password ? copyPassword : undefined}
                  autoComplete="new-password"
                  name="vault-secret"
                  frameClassName="flex-1"
                />
                <Button type="button" variant="soft" onClick={toggleGenerator} aria-expanded={generatorOpen} className={wide ? "h-11" : "h-13"}>
                  <Sparkles />
                  {t("Generate")}
                </Button>
              </div>
            </Field>
            {/* Advice only: a short PIN is saved like any other password. */}
            {detail && <StrengthMeter password={draft.password} detail={t(detail.key, { count: formatCount(detail.count, locale) })} className="-mt-2" />}
            {generatorOpen && (
              <PasswordGenerator
                onGenerate={(password) => {
                  set({ password });
                  setShown(true);
                }}
              />
            )}

            <Field htmlFor="ve-notes" label={label(t("Notes"), true)}>
              <Textarea id="ve-notes" rows={2} value={draft.notes} onChange={(event) => set({ notes: event.target.value })} maxLength={1000} />
            </Field>

            {draft.holderOpen ? (
              <Field
                htmlFor="ve-holder"
                label={label(t("Account holder name"), true)}
                aside={
                  <button type="button" onClick={() => set({ holderOpen: false, holder: "" })} aria-label={t("Remove account holder name")} className="-my-3 flex min-h-11 items-center rounded-md px-2 text-small font-semibold text-ink-muted hover:text-expense">
                    {t("Remove")}
                  </button>
                }
                hint={t("The name the account is registered in, like a bank account's.")}
              >
                <Input id="ve-holder" size={size} value={draft.holder} onChange={(event) => set({ holder: event.target.value })} maxLength={120} autoComplete="off" name="vault-holder" aria-describedby="ve-holder-hint" />
              </Field>
            ) : (
              <button type="button" onClick={() => set({ holderOpen: true })} className="-ml-2 flex min-h-11 w-fit items-center rounded-md px-2 text-small font-semibold text-emerald hover:underline">
                + {t("Account holder name")}
              </button>
            )}
          </div>

          <div className={cn("flex items-center justify-end gap-3 border-t border-line bg-surface", wide ? "px-6 py-4" : "px-4 py-3")}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" variant="action" disabled={isPending} className="px-5">
              {isPending && <Loader size={16} onDark label={t("Loading...")} />}
              {t(editing ? "Save changes" : "Save login")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
