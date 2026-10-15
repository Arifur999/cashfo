"use client";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { createBusinessAction } from "@/lib/customer/businessActions";
import { createGroupMemberAction } from "@/lib/customer/groupExpensesActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface NewGroupDrawerProps {
  open: boolean;
  onClose: () => void;
}

const STARTS = ["Every expense is paid from the group fund", "Costs are shared equally among the members", "One open month at a time, closed by you"];

// A new group in the design's drawer: its name, the members as chips, and
// whether you are one of them. The group is created, then each member
// added, and the page moves into the group's first steps.
export function NewGroupDrawer({ open, onClose }: NewGroupDrawerProps) {
  const { t } = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const wide = useMediaQuery("(min-width: 768px)");
  const [name, setName] = useState("");
  const [names, setNames] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [includeMe, setIncludeMe] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setName("");
      setNames([]);
      setDraft("");
      setIncludeMe(true);
    }
  }

  const me = user.name.trim();
  const everyone = includeMe && me ? [me, ...names.filter((n) => n.toLowerCase() !== me.toLowerCase())] : names;

  function addDraft() {
    const value = draft.trim();
    if (!value) return;
    if (!names.some((n) => n.toLowerCase() === value.toLowerCase())) setNames([...names, value]);
    setDraft("");
  }

  function onDraftKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addDraft();
    } else if (event.key === "Backspace" && draft === "" && names.length > 0) {
      setNames(names.slice(0, -1));
    }
  }

  const valid = name.trim().length > 0;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending) return;
    startTransition(async () => {
      const created = await createBusinessAction({ name: name.trim(), currency: "BDT", type: "GROUP" });
      if (!created.success || !created.data) {
        toast.error(created.message ?? t("Failed to create the group"));
        return;
      }
      const members = everyone.length > 0 ? everyone : draft.trim() ? [draft.trim()] : [];
      const results = await Promise.all(members.map((memberName) => createGroupMemberAction(created.data!.id, { name: memberName })));
      const failed = results.filter((r) => !r.success).length;
      if (failed > 0) toast.warning(`${failed} ${t(failed === 1 ? "member could not be added" : "members could not be added")}`);
      toast.success(t("Group created"));
      onClose();
      router.push(`/group-expenses/${created.data.id}`);
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <SheetContent side={wide ? "right" : "bottom"} showCloseButton={false} className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? "w-120 shadow-[-28px_0_60px_-16px_rgba(11,61,46,0.3)] data-[side=right]:sm:max-w-120" : "h-[92vh] rounded-t-xl")}>
        <SheetHeader className={cn("flex-row items-center justify-between gap-3 space-y-0", wide ? "border-b border-line px-6 py-5" : "px-4 pt-4 pb-2")}>
          <SheetTitle className="text-h3 text-ink">{t("New group")}</SheetTitle>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </SheetHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto", wide ? "px-6 py-5" : "px-4 py-3")}>
            <Field htmlFor="ng-name" label={t("Group name")} hint={`${t("For example")}: আমাদের মেস, বাসা ৩২, Mirpur Family`}>
              <Input id="ng-name" value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={80} placeholder="Uttara Mess" />
            </Field>

            <div className="flex flex-col gap-2">
              <span className="text-body font-medium text-ink">{t("Members")}</span>
              <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-md border border-line-strong bg-surface px-3 py-2 focus-within:border-emerald focus-within:shadow-[0_0_0_0.5px_var(--emerald),0_0_0_4px_var(--mint-50)]">
                {everyone.map((memberName) => {
                  const isMe = includeMe && memberName === me;
                  return (
                    <span key={memberName} className="flex h-7.5 items-center gap-2 rounded-full bg-surface-sunken py-0 pr-2 pl-1 text-small font-medium text-ink">
                      <PersonAvatar name={memberName} size={22} coloured />
                      {memberName}
                      {isMe && <span className="text-ink-muted">({t("you")})</span>}
                      <button type="button" onClick={() => (isMe ? setIncludeMe(false) : setNames(names.filter((n) => n !== memberName)))} aria-label={`${t("Remove")} ${memberName}`} className="flex size-5 items-center justify-center rounded-full text-ink-muted hover:bg-line hover:text-ink">
                        <X className="size-3" aria-hidden="true" />
                      </button>
                    </span>
                  );
                })}
                <input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={onDraftKey} onBlur={addDraft} aria-label={t("Add a member by name")} placeholder={t("Type a name, press Enter")} className="h-7.5 min-w-37.5 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-muted" />
              </div>
              {me && (
                <label className="flex cursor-pointer items-center gap-3 text-small text-ink-2">
                  <span role="checkbox" aria-checked={includeMe} tabIndex={0} onKeyDown={(event) => (event.key === " " || event.key === "Enter") && (event.preventDefault(), setIncludeMe(!includeMe))} onClick={() => setIncludeMe(!includeMe)} className={cn("flex size-4.5 shrink-0 items-center justify-center rounded-[5px] border transition-colors", includeMe ? "border-emerald bg-emerald text-white" : "border-line-strong bg-surface")}>
                    {includeMe && <Check className="size-3" strokeWidth={3} aria-hidden="true" />}
                  </span>
                  {t("I'm part of this group too")} ({t("added as")} {me})
                </label>
              )}
              <span className="text-caption font-normal text-ink-muted">{t("You can add phone numbers and photos later. Members don't need their own login: you record contributions and expenses for them.")}</span>
            </div>

            <div className="flex flex-col gap-3 rounded-md border border-line bg-cream p-4">
              <span className="text-small font-semibold text-ink-2">{t("A group starts with")}</span>
              {STARTS.map((line) => (
                <span key={line} className="flex items-start gap-2 text-small text-ink-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald" aria-hidden="true" />
                  {t(line)}
                </span>
              ))}
              <span className="text-caption font-normal text-ink-muted">{t("All of it can be changed later in Settings.")}</span>
            </div>
          </div>

          <div className={cn("flex items-center justify-end gap-3 border-t border-line bg-surface", wide ? "px-6 py-4" : "px-4 py-3")}>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={!valid || isPending} className="px-5">
              {isPending && <Loader />}
              {t("Create group")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
