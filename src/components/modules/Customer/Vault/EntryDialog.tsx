"use client";

import { Check, ChevronDown, ChevronRight, ChevronUp, Copy, Eye, EyeOff, Info, Lock, Sparkles, Star } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Banner from "@/components/smartly/Banner";
import Button from "@/components/smartly/Button";
import Input from "@/components/smartly/form/Input";
import Textarea from "@/components/smartly/form/Textarea";
import { SOFT_TONE } from "@/components/smartly/tones";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { VaultEntryCategory, VaultEntrySummary } from "@/lib/customer/api";
import { createVaultEntryAction, updateVaultEntryAction } from "@/lib/customer/passwordVaultActions";
import { draftProblems, entryInput, isLockedMessage, passwordDetail, passwordStrength, serviceSuggestions, settle, type EntryDraft } from "@/lib/customer/vaultDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { clearClipboardLater, copySecret } from "./clipboard";
import { DEFAULT_SETTINGS, makePassword, PasswordGenerator, type GeneratorSettings } from "./PasswordGenerator";
import { VAULT_CATEGORIES, VAULT_CATEGORY_ICONS, VAULT_CATEGORY_LABELS, VAULT_CATEGORY_TONE } from "./vaultCategoryDisplay";
import { VaultDialog } from "./VaultDialog";

interface EntryDialogProps {
  open: boolean;
  // What the popup holds. The page keeps it (and keeps it through a lock).
  draft: EntryDraft | null;
  token: string;
  onChange: (draft: EntryDraft) => void;
  onClose: () => void;
  // Saved: the login as the API answers it, and whether its password changed.
  onSaved: (entry: VaultEntrySummary, passwordChanged: boolean) => void;
  // The session ended: the page locks, keeping the draft for the next unlock.
  onLocked: () => void;
}

const STRENGTH_BAR: Record<number, string> = { 1: "bg-expense-fill", 2: "bg-warning-fill", 3: "bg-emerald/70", 4: "bg-emerald" };
const STRENGTH_TEXT: Record<number, string> = { 1: "text-expense", 2: "text-warning", 3: "text-emerald", 4: "text-emerald" };

const SECTION_TITLE = "text-[11.5px] leading-normal font-semibold tracking-[0.06em] text-ink-muted uppercase";
const LABEL = "text-[13.5px] leading-normal font-medium text-ink-2";

// Add or edit a login (design: the centred Add login popup): Account (a
// Name box that suggests popular services, and the website), Sign-in
// details (username, a password you type or generate, its strength and
// options), Organize (category, favorite), then More details folded.
export function EntryDialog({ open, draft, token, onChange, onClose, onSaved, onLocked }: EntryDialogProps) {
  const { t, fmt } = useLocale();
  const [shown, setShown] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [settings, setSettings] = useState<GeneratorSettings>(DEFAULT_SETTINGS);
  // A password the generator made (Generate says Make another then).
  const [made, setMade] = useState(false);
  // The Name box's suggestions, and the one the arrows are on.
  const [suggesting, setSuggesting] = useState(false);
  const [active, setActive] = useState(-1);
  // A save was tried with something missing: the fields say what.
  const [tried, setTried] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Every opening starts fresh: password hidden (shown when changing it),
  // options folded, More details open when there is something in it.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setShown(!!draft?.change);
      setOptionsOpen(false);
      setMoreOpen(!!draft && (draft.notes !== "" || draft.holder !== ""));
      setMade(false);
      setSuggesting(false);
      setActive(-1);
      setTried(false);
    }
  }

  if (!draft) return null;

  const editing = draft.editing;
  const set = (patch: Partial<EntryDraft>) => onChange({ ...draft, ...patch });
  const problems = draftProblems(draft);
  const titleError = tried && problems.title ? t(problems.title) : undefined;
  const passwordError = tried && problems.password ? t(problems.password) : undefined;
  const strength = passwordStrength(draft.password);
  const detail = passwordDetail(draft.password);
  const suggestions = editing ? [] : serviceSuggestions(draft.title, t);
  const listOpen = suggesting && suggestions.length > 0;
  const letter = draft.title.trim().charAt(0) || "+";
  const Icon = VAULT_CATEGORY_ICONS[draft.category];

  const head = editing ? (draft.change ? t("Change the {title} password", { title: editing.title }) : t("Edit {title}", { title: draft.title.trim() || editing.title })) : t("Add login");
  const sub = draft.change ? t("Set the new password on the website first, then save it here.") : editing ? t("Change anything, then save.") : t("Save a login so you never have to remember it.");

  function generate(next = settings) {
    set({ password: makePassword(next) });
    setShown(true);
    setMade(true);
  }

  function pick(index: number) {
    const service = suggestions[index];
    if (!service) return;
    set({ title: service.title, category: service.category, website: service.website });
    setSuggesting(false);
    setActive(-1);
  }

  function nameKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!listOpen) {
      if (event.key === "ArrowDown" && suggestions.length) setSuggesting(true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      pick(active);
    } else if (event.key === "Escape") {
      // Closes the list, not the popup.
      event.preventDefault();
      event.stopPropagation();
      setSuggesting(false);
    }
  }

  function copyPassword() {
    if (!draft?.password) {
      toast.error(t("There is no password to copy yet."));
      return;
    }
    void copySecret(Promise.resolve(draft.password)).then((outcome) => {
      if (outcome !== "copied") {
        toast.error(t("Couldn't copy. Select the text and copy it yourself."));
        return;
      }
      clearClipboardLater();
      toast.success(t("Password copied"), { description: t("The clipboard clears in 30 seconds.") });
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (isPending || !draft) return;
    if (problems.title || problems.password) {
      setTried(true);
      document.getElementById(problems.title ? "ve-name" : "ve-pass")?.focus();
      return;
    }
    const saving = draft;
    startTransition(async () => {
      const input = entryInput({ ...saving, holderOpen: true });
      const result = await settle(saving.editing ? updateVaultEntryAction(token, saving.editing.id, input) : createVaultEntryAction(token, input));
      if (result.success && result.data) {
        const changed = !!saving.password && (!saving.editing || result.data.passwordChangedAt !== saving.editing.passwordChangedAt);
        const title = result.data.title;
        if (!saving.editing) toast.success(t("{title} added to your vault", { title }));
        else if (changed) toast.success(t("{title} updated with the new password", { title }), saving.change ? { description: t("Fixed in your security checkup.") } : undefined);
        else toast.success(t("{title} saved", { title }));
        onSaved(result.data, changed);
        onClose();
      } else if (isLockedMessage(result.message)) {
        onLocked();
      } else {
        toast.error(t(result.message ?? "Failed to save entry"));
      }
    });
  }

  const lead = (
    <span aria-hidden="true" className={cn("flex size-10 shrink-0 items-center justify-center rounded-[12px] text-[17px] font-bold", SOFT_TONE[VAULT_CATEGORY_TONE[draft.category]])}>
      {letter}
    </span>
  );

  return (
    <VaultDialog
      open={open}
      onClose={onClose}
      busy={isPending}
      width={580}
      headLine
      title={head}
      sub={sub}
      lead={lead}
      onSubmit={submit}
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        document.getElementById(draft.change ? "ve-pass" : "ve-name")?.focus();
      }}
      bodyClassName="px-4 sm:px-6"
      footer={
        <>
          <span className="flex min-w-0 flex-1 items-center gap-1.5 text-caption text-ink-muted max-sm:basis-full">
            <Lock className="size-3.25 shrink-0" aria-hidden="true" />
            {t("The password is encrypted when you save")}
          </span>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending} className="h-10.5 max-sm:flex-1">
            {t("Cancel")}
          </Button>
          <Button type="submit" variant="action" disabled={isPending} className="h-10.5 px-5 max-sm:flex-1">
            {isPending && <Loader size={16} onDark label={t("Loading...")} />}
            {t(editing ? "Save changes" : "Save login")}
          </Button>
        </>
      }
    >
      {draft.kept && (
        <Banner inline tone="mint" icon={<Info />} className="mt-4">
          {t("We kept the login you were editing.")}
        </Banner>
      )}

      <section aria-labelledby="ve-s1" className="flex flex-col gap-3 py-4.5">
        <h3 id="ve-s1" className={SECTION_TITLE}>
          {t("Account")}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="relative flex flex-col gap-1.5">
            <label htmlFor="ve-name" className={LABEL}>
              {t("Name")}
            </label>
            <Input
              id="ve-name"
              size="md"
              frameClassName="h-11.5"
              value={draft.title}
              onChange={(event) => {
                set({ title: event.target.value });
                setSuggesting(true);
                setActive(-1);
              }}
              onFocus={() => setSuggesting(true)}
              onClick={() => setSuggesting(true)}
              onBlur={() => setSuggesting(false)}
              onKeyDown={nameKey}
              invalid={!!titleError}
              maxLength={120}
              placeholder={editing ? undefined : t("Start typing, e.g. Facebook")}
              autoComplete="off"
              name="vault-title"
              role={editing ? undefined : "combobox"}
              aria-expanded={editing ? undefined : listOpen}
              aria-controls={editing ? undefined : "ve-sug"}
              aria-autocomplete={editing ? undefined : "list"}
              aria-activedescendant={listOpen && active >= 0 ? `ve-sug-${active}` : undefined}
              aria-invalid={titleError ? true : undefined}
              aria-describedby={titleError ? "ve-name-error" : undefined}
            />
            {titleError && (
              <span id="ve-name-error" className="text-small text-expense">
                {titleError}
              </span>
            )}
            {listOpen && (
              <div id="ve-sug" role="listbox" aria-label={t("Popular services")} className="absolute top-19 left-0 z-20 flex w-full flex-col gap-0.5 rounded-[14px] border border-line bg-surface p-1.5 shadow-overlay">
                <span className="px-2 pt-1 pb-1.5 text-[11.5px] font-semibold text-ink-faint">{draft.title.trim() ? t("Matches") : t("Popular, pick one to fill in the details")}</span>
                {suggestions.map((service, index) => {
                  const tone = SOFT_TONE[VAULT_CATEGORY_TONE[service.category]];
                  return (
                    <button
                      key={service.title}
                      id={`ve-sug-${index}`}
                      type="button"
                      role="option"
                      aria-selected={index === active}
                      // Picked before the box's blur closes the list.
                      onMouseDown={(event) => {
                        event.preventDefault();
                        pick(index);
                      }}
                      className={cn("flex h-10 items-center gap-2.5 rounded-[10px] px-2 text-left hover:bg-surface-sunken pointer-coarse:h-11", index === active && "bg-surface-sunken")}
                    >
                      <span aria-hidden="true" className={cn("flex size-6.5 shrink-0 items-center justify-center rounded-lg text-caption font-bold", tone)}>
                        {service.title.charAt(0)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-body font-semibold text-ink">{service.title}</span>
                      <span className="text-caption whitespace-nowrap text-ink-faint">{t(VAULT_CATEGORY_LABELS[service.category])}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ve-site" className={LABEL}>
              {t("Website")} <span className="font-normal text-ink-faint">({t("optional")})</span>
            </label>
            <Input id="ve-site" size="md" frameClassName="h-11.5" type="text" inputMode="url" value={draft.website} onChange={(event) => set({ website: event.target.value })} maxLength={200} placeholder="facebook.com" autoComplete="off" name="vault-site" />
          </div>
        </div>
      </section>

      <section aria-labelledby="ve-s2" className="flex flex-col gap-3 border-t border-divider py-4.5">
        <h3 id="ve-s2" className={SECTION_TITLE}>
          {t("Sign-in details")}
        </h3>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ve-user" className={LABEL}>
            {t("Username, email or phone")}
          </label>
          <Input id="ve-user" size="md" frameClassName="h-11.5" value={draft.username} onChange={(event) => set({ username: event.target.value })} maxLength={200} placeholder={t("What you type to log in")} autoComplete="off" name="vault-user" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ve-pass" className={LABEL}>
            {t("Password")}
          </label>
          <Input
            id="ve-pass"
            size="md"
            frameClassName={cn("h-12", draft.password && !passwordError && "border-emerald")}
            className="font-mono text-[15px] tracking-[0.03em]"
            type={shown ? "text" : "password"}
            value={draft.password}
            onChange={(event) => set({ password: event.target.value })}
            invalid={!!passwordError}
            aria-invalid={passwordError ? true : undefined}
            aria-describedby={passwordError ? "ve-pass-error" : editing ? "ve-pass-hint" : undefined}
            placeholder={editing ? t("Leave blank to keep the current password") : undefined}
            autoComplete="new-password"
            name="vault-secret"
            trailing={
              <span className="flex items-center gap-0.5">
                <button type="button" onClick={() => setShown(!shown)} aria-label={t(shown ? "Hide password" : "Show password")} title={t(shown ? "Hide password" : "Show password")} className="flex size-9 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink">
                  {shown ? <EyeOff className="size-4.25" aria-hidden="true" /> : <Eye className="size-4.25" aria-hidden="true" />}
                </button>
                <button type="button" onClick={copyPassword} aria-label={t("Copy password")} title={t("Copy password")} className="flex size-9 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink">
                  <Copy className="size-4.25" aria-hidden="true" />
                </button>
                <span aria-hidden="true" className="mx-1 h-5.5 w-px bg-line" />
                <button type="button" onClick={() => generate()} title={t("Make a strong password")} className="flex h-9 items-center gap-1.5 rounded-[9px] bg-emerald-soft px-3 text-[13px] font-semibold whitespace-nowrap text-emerald hover:bg-mint-200 dark:hover:bg-emerald/20">
                  <Sparkles className="size-3.5" aria-hidden="true" />
                  {t(made ? "Make another" : "Generate")}
                </button>
              </span>
            }
          />
          {passwordError ? (
            <span id="ve-pass-error" className="text-small text-expense">
              {passwordError}
            </span>
          ) : (
            editing && (
              <span id="ve-pass-hint" className="text-caption text-ink-muted">
                {t(draft.password ? "Saving replaces the current password." : "Leave blank to keep the current password.")}
              </span>
            )
          )}
          <div className="flex items-center gap-2.5">
            <span aria-hidden="true" className="flex w-30 shrink-0 gap-1">
              {[1, 2, 3, 4].map((bar) => (
                <span key={bar} className={cn("h-1 flex-1 rounded-full", draft.password && strength.score >= bar ? STRENGTH_BAR[Math.max(1, strength.score)] : "bg-line")} />
              ))}
            </span>
            <span className="min-w-0 flex-1 text-[12.5px] text-ink-muted">
              {draft.password && (
                <>
                  <b className={cn("font-semibold", STRENGTH_TEXT[Math.max(1, strength.score)])}>{t(strength.label === "Too short" ? "Weak" : strength.label)}</b>
                  {detail && ` · ${t(detail.key, { count: formatCount(detail.count, fmt) })}`}
                </>
              )}
            </span>
            <button type="button" onClick={() => setOptionsOpen(!optionsOpen)} aria-expanded={optionsOpen} className="flex min-h-8 shrink-0 items-center gap-1 rounded-md text-[12.5px] font-semibold whitespace-nowrap text-ink-soft hover:text-ink pointer-coarse:min-h-11">
              {t("Password options")}
              {optionsOpen ? <ChevronUp className="size-3.25" aria-hidden="true" /> : <ChevronDown className="size-3.25" aria-hidden="true" />}
            </button>
          </div>
          {optionsOpen && (
            <PasswordGenerator
              settings={settings}
              onChange={(next) => {
                setSettings(next);
                generate(next);
              }}
            />
          )}
        </div>
      </section>

      <section aria-labelledby="ve-s3" className="flex flex-col gap-3 border-t border-divider py-4.5">
        <h3 id="ve-s3" className={SECTION_TITLE}>
          {t("Organize")}
        </h3>
        <div className="grid items-end gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <span id="ve-cat-l" className={LABEL}>
              {t("Category")}
            </span>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-labelledby="ve-cat-l ve-cat-v" className="flex h-11.5 items-center gap-2.5 rounded-[12px] border border-line-strong bg-surface pr-3 pl-2 text-left text-[14.5px] text-ink data-[state=open]:border-emerald">
                  <span aria-hidden="true" className={cn("flex size-7.5 shrink-0 items-center justify-center rounded-[9px] [&_svg]:size-3.5", SOFT_TONE[VAULT_CATEGORY_TONE[draft.category]])}>
                    <Icon />
                  </span>
                  <span id="ve-cat-v" className="flex-1">
                    {t(VAULT_CATEGORY_LABELS[draft.category])}
                  </span>
                  <ChevronDown className="size-4 text-ink-muted" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-(--radix-dropdown-menu-trigger-width) rounded-[14px] p-1.5">
                <DropdownMenuRadioGroup value={draft.category} onValueChange={(value) => set({ category: value as VaultEntryCategory })}>
                  {VAULT_CATEGORIES.map((value) => {
                    const CategoryIcon = VAULT_CATEGORY_ICONS[value];
                    return (
                      <DropdownMenuRadioItem key={value} value={value} className="h-9 gap-2.5 rounded-[9px] pr-2 pl-2 text-[13.5px] [&>span:first-child]:hidden">
                        <span aria-hidden="true" className={cn("flex size-6 shrink-0 items-center justify-center rounded-[7px] [&_svg]:size-3", SOFT_TONE[VAULT_CATEGORY_TONE[value]])}>
                          <CategoryIcon />
                        </span>
                        <span className={cn("flex-1", value === draft.category && "font-semibold")}>{t(VAULT_CATEGORY_LABELS[value])}</span>
                        {value === draft.category && <Check className="size-3.5 text-emerald" strokeWidth={2.75} aria-hidden="true" />}
                      </DropdownMenuRadioItem>
                    );
                  })}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={draft.favorite}
            onClick={() => set({ favorite: !draft.favorite })}
            className={cn("flex h-11.5 items-center gap-2.5 rounded-[12px] border px-3 text-left text-body font-medium text-ink", draft.favorite ? "border-warning-line bg-warning-50" : "border-line-strong bg-surface")}
          >
            <Star className={cn("size-4.25", draft.favorite ? "fill-warning-fill text-warning-fill" : "text-ink-faint")} strokeWidth={1.75} aria-hidden="true" />
            <span className="flex-1">{t("Add to Favorites")}</span>
            <span aria-hidden="true" className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", draft.favorite ? "bg-warning-fill" : "bg-line-strong")}>
              <span className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-[left]", draft.favorite ? "left-4.5" : "left-0.5")} />
            </span>
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t border-divider pt-3.5 pb-4.5">
        <button type="button" onClick={() => setMoreOpen(!moreOpen)} aria-expanded={moreOpen} className="flex min-h-8 w-fit items-center gap-1.5 rounded-md text-[13.5px] font-semibold text-emerald pointer-coarse:min-h-11">
          {moreOpen ? <ChevronUp className="size-3.5" aria-hidden="true" /> : <ChevronRight className="size-3.5" aria-hidden="true" />}
          {t("More details: notes and account holder name")}
        </button>
        {moreOpen && (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ve-holder" className={LABEL}>
                {t("Account holder name")}
              </label>
              <Input id="ve-holder" size="md" frameClassName="h-11.5" value={draft.holder} onChange={(event) => set({ holder: event.target.value, holderOpen: true })} maxLength={120} placeholder={t("Name on the account")} autoComplete="off" name="vault-holder" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ve-notes" className={LABEL}>
                {t("Notes")}
              </label>
              <Textarea id="ve-notes" rows={2} value={draft.notes} onChange={(event) => set({ notes: event.target.value })} maxLength={1000} placeholder={t("Anything that helps you, like which email it uses")} />
            </div>
          </>
        )}
      </section>
    </VaultDialog>
  );
}
