"use client";

import { Sparkles, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import Textarea from "@/components/smartly/form/Textarea";
import { SOFT_TONE } from "@/components/smartly/tones";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { VaultEntryCategory, VaultEntrySummary } from "@/lib/customer/api";
import { createVaultEntryAction, updateVaultEntryAction } from "@/lib/customer/passwordVaultActions";
import { normalizeUrl, passwordStrength, type QuickLogin } from "@/lib/customer/vaultDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PasswordField } from "@/components/modules/Customer/Shared/PasswordField";
import { PasswordGenerator } from "./PasswordGenerator";
import { StrengthMeter } from "@/components/modules/Customer/Shared/StrengthMeter";
import { VAULT_CATEGORIES, VAULT_CATEGORY_ICONS, VAULT_CATEGORY_LABELS, VAULT_CATEGORY_TONE } from "./vaultCategoryDisplay";
import { isLockedMessage } from "./VaultPageClient";

interface EntryDrawerProps {
  open: boolean;
  // The login being edited; null adds a new one.
  editing: VaultEntrySummary | null;
  // A quick-add pick from the empty vault, filled in to start with.
  preset: QuickLogin | null;
  token: string;
  onClose: () => void;
  onSaved: (entry: VaultEntrySummary) => void;
  onLocked: () => void;
}

// Add or edit a login: category, where it is, the username, a password you
// type or generate, and notes.
export function EntryDrawer({ open, editing, preset, token, onClose, onSaved, onLocked }: EntryDrawerProps) {
  const { t } = useLocale();
  const wide = useMediaQuery("(min-width: 768px)");
  const [category, setCategory] = useState<VaultEntryCategory>("OTHER");
  const [title, setTitle] = useState("");
  const [website, setWebsite] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [notes, setNotes] = useState("");
  const [holder, setHolder] = useState("");
  const [holderOpen, setHolderOpen] = useState(false);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? (editing?.id ?? `create:${preset?.title ?? ""}`) : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setCategory(editing?.category ?? preset?.category ?? "OTHER");
      setTitle(editing?.title ?? preset?.title ?? "");
      setWebsite(editing?.websiteUrl ?? preset?.website ?? "");
      setUsername(editing?.usernameOrEmail ?? "");
      setPassword("");
      setNotes(editing?.notes ?? "");
      setHolder(editing?.holderName ?? "");
      setHolderOpen(!!editing?.holderName);
      setGeneratorOpen(false);
    }
  }

  const strength = passwordStrength(password);
  const valid = title.trim().length > 0 && (editing !== null || password.length > 0);
  const detail = password.length > 0 ? `${password.length} ${t("characters")}${/\d/.test(password) && /[^A-Za-z0-9]/.test(password) ? ` ${t("with numbers and symbols")}` : /\d/.test(password) ? ` ${t("with numbers")}` : ""}` : "";

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(password);
      toast.success(t("Password copied"));
    } catch {
      toast.error(t("Couldn't copy. Select the text and copy it yourself."));
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending) return;
    startTransition(async () => {
      const input = {
        title: title.trim(),
        category,
        websiteUrl: normalizeUrl(website) || undefined,
        usernameOrEmail: username.trim() || undefined,
        holderName: holderOpen ? holder.trim() || undefined : undefined,
        notes: notes.trim() || undefined,
        ...(password ? { password } : {}),
      };
      const result = editing ? await updateVaultEntryAction(token, editing.id, input) : await createVaultEntryAction(token, input);
      if (result.success && result.data) {
        toast.success(t(editing ? "Login updated" : "Login saved"));
        onSaved(result.data);
        onClose();
      } else if (isLockedMessage(result.message)) {
        onClose();
        onLocked();
      } else {
        toast.error(result.message ?? t("Failed to save entry"));
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
      <SheetContent side={wide ? "right" : "bottom"} showCloseButton={false} className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? "w-125 shadow-[-28px_0_60px_-16px_rgba(11,61,46,0.3)] data-[side=right]:sm:max-w-125" : "h-[92vh] rounded-t-xl")}>
        <SheetHeader className={cn("flex-row items-center justify-between gap-3 space-y-0", wide ? "border-b border-line px-6 py-4" : "px-4 pt-4 pb-2")}>
          <SheetTitle className="text-h3 text-ink">{editing ? t("Edit login") : t("Add login")}</SheetTitle>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </SheetHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" autoComplete="off">
          <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto", wide ? "px-6 py-4" : "px-4 py-3")}>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-body font-medium text-ink">{t("Category")}</legend>
              <div role="radiogroup" aria-label={t("Category")} className="flex flex-wrap gap-2">
                {VAULT_CATEGORIES.map((value) => {
                  const Icon = VAULT_CATEGORY_ICONS[value];
                  const on = value === category;
                  return (
                    <button key={value} type="button" role="radio" aria-checked={on} onClick={() => setCategory(value)} className={cn("flex h-7.5 items-center gap-2 rounded-full border py-0 pr-3 pl-2 text-small text-ink", on ? "border-[1.5px] border-emerald bg-mint-50 font-bold" : "border-line bg-surface font-medium hover:border-line-strong")}>
                      <span className={cn("flex size-5 items-center justify-center rounded-full [&_svg]:size-3", SOFT_TONE[VAULT_CATEGORY_TONE[value]])}>
                        <Icon aria-hidden="true" />
                      </span>
                      {t(VAULT_CATEGORY_LABELS[value])}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field htmlFor="ve-title" label={label(t("Title"))}>
                <Input id="ve-title" size="md" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} autoFocus placeholder={t("e.g. Facebook, Dutch Bangla Bank")} autoComplete="off" name="vault-title" />
              </Field>
              <Field htmlFor="ve-site" label={label(t("Website"))}>
                <Input id="ve-site" size="md" type="text" inputMode="url" value={website} onChange={(event) => setWebsite(event.target.value)} maxLength={200} placeholder="rokomari.com" autoComplete="off" name="vault-site" />
              </Field>
            </div>
            <Field htmlFor="ve-user" label={label(t("Username or email"))}>
              <Input id="ve-user" size="md" value={username} onChange={(event) => setUsername(event.target.value)} maxLength={200} autoComplete="off" name="vault-user" />
            </Field>

            <Field htmlFor="ve-pass" label={label(t("Password"))} hint={editing ? t("Leave blank to keep the current password.") : undefined}>
              <div className="flex gap-2">
                <PasswordField id="ve-pass" size="md" value={password} onChange={setPassword} mono onCopy={password ? copyPassword : undefined} autoComplete="new-password" name="vault-secret" frameClassName="flex-1" />
                <Button
                  type="button"
                  variant="soft"
                  onClick={() => {
                    setGeneratorOpen((v) => !v);
                  }}
                  aria-expanded={generatorOpen}
                  className="h-11"
                >
                  <Sparkles />
                  {t("Generate")}
                </Button>
              </div>
            </Field>
            {password.length > 0 && <StrengthMeter password={password} detail={detail} className="-mt-2" />}
            {generatorOpen && <PasswordGenerator onGenerate={setPassword} />}

            <Field htmlFor="ve-notes" label={label(t("Notes"), true)}>
              <Textarea id="ve-notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} />
            </Field>

            {holderOpen ? (
              <Field htmlFor="ve-holder" label={label(t("Account holder name"), true)} hint={t("The name the account is registered in, like a bank account's.")}>
                <Input id="ve-holder" size="md" value={holder} onChange={(event) => setHolder(event.target.value)} maxLength={120} autoComplete="off" name="vault-holder" />
              </Field>
            ) : (
              <button type="button" onClick={() => setHolderOpen(true)} className="w-fit text-small font-semibold text-emerald hover:underline">
                + {t("Account holder name")}
              </button>
            )}
          </div>

          <div className={cn("flex items-center justify-end gap-3 border-t border-line bg-surface", wide ? "px-6 py-4" : "px-4 py-3")}>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" variant="action" disabled={!valid || isPending || (password.length > 0 && strength.label === "Too short")} className="px-5">
              {isPending && <Loader />}
              {t(editing ? "Save changes" : "Save login")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
