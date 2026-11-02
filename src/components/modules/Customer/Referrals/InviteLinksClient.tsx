"use client";

import { Info, Link2, Plus, QrCode, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { TopbarExtras } from "@/components/modules/Customer/Layout/TopbarExtras";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import ErrorState from "@/components/smartly/ErrorState";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { ListCard, ListCell, ListHead, ListHeadCell, ListRow } from "@/components/smartly/list";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/customer/currency";
import { createReferralLinkAction, deleteReferralLinkAction } from "@/lib/customer/referralActions";
import { cleanTag, dayOf, friendDay, inviteLink, isTag, linkText } from "@/lib/customer/referralDisplay";
import type { ReferralLink } from "@/lib/customer/referralTypes";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { QrDialog } from "./QrDialog";
import { useCopy } from "./ReferralBits";

interface InviteLinksClientProps {
  links: ReferralLink[] | null;
  code: string | null;
  origin: string;
  currency: string;
  today: string;
}

// Link | Clicks | Joined | Paying | Earned | Share
const COLUMNS = "md:grid-cols-[minmax(0,1fr)_72px_72px_72px_100px_150px]";

// Referrals > Invite links (ReferralLinks): one link for each place the
// member shares, so they see which place brings paying people. Each counts
// its opens, sign-ups, paying friends and earnings; Copy and QR on every
// row; a tagged link can be deleted (its friends keep its name).
export function InviteLinksClient({ links: initial, code, origin, currency, today }: InviteLinksClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const copy = useCopy();
  const [links, setLinks] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [removing, setRemoving] = useState<ReferralLink | null>(null);
  const [isRemoving, startRemove] = useTransition();
  const money = (value: string | number) => formatCurrency(value, currency, fmt);

  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setLinks(initial);
  }

  if (!links || !code) {
    return (
      <PageFrame className="max-md:pt-4 md:gap-5">
        <TopbarExtras title={t("Invite links")} />
        <ErrorState title={t("Couldn't load your invite links.")} onRetry={() => router.refresh()} />
      </PageFrame>
    );
  }

  const urlOf = (link: ReferralLink) => inviteLink(origin, code, link.tag);
  const clicks = links.reduce((sum, l) => sum + l.clicks, 0);
  const joined = links.reduce((sum, l) => sum + l.joined, 0);
  const paying = links.reduce((sum, l) => sum + l.paying, 0);
  const best = [...links].sort((a, b) => Number(b.earned) - Number(a.earned) || b.paying - a.paying)[0];
  const since = links.reduce((first, l) => (l.createdAt < first ? l.createdAt : first), links[0]?.createdAt ?? "");

  function remove() {
    const link = removing;
    if (!link) return;
    startRemove(async () => {
      const result = await deleteReferralLinkAction(link.id).catch(() => null);
      if (result?.success && result.data) {
        setLinks(result.data);
        toast.success(t("Link deleted"));
      } else toast.error(t(result?.message ?? "Couldn't delete the link."));
      setRemoving(null);
    });
  }

  const stats = [
    { label: t("Clicks on your links"), value: formatCount(clicks, fmt), sub: since ? t("Since {date}", { date: friendDay(dayOf(since), today, fmt) }) : "" },
    { label: t("Signed up"), value: formatCount(joined, fmt), sub: t(paying === 1 ? "{count} of them pays" : "{count} of them pay", { count: formatCount(paying, fmt) }) },
    { label: t("Best place"), value: best && Number(best.earned) > 0 ? best.label : "—", sub: best && Number(best.earned) > 0 ? t("{amount} earned", { amount: money(best.earned) }) : t("No earnings yet") },
  ];

  return (
    <PageFrame className="max-md:gap-3.5 max-md:pt-4 md:gap-5">
      <TopbarExtras title={t("Invite links")} />
      <PageHeader
        title={t("Invite links")}
        description={t("One link for each place you share, so you can see what works.")}
        hideDescriptionOnPhone
        className="max-md:[&_h1]:sr-only"
        actions={
          <Button size="lg" onClick={() => setCreating(true)} className="rounded-full">
            <Plus className="size-4" />
            {t("New link")}
          </Button>
        }
      />
      <div className="grid gap-2.5 sm:grid-cols-3 md:gap-3.5">
        {stats.map((stat) => (
          <Card key={stat.label} padding="none" className="flex flex-col gap-0.5 px-4.5 py-3.5">
            <span className="text-caption text-ink-muted">{stat.label}</span>
            <span className="truncate text-[22px] leading-normal font-bold text-ink tabular-nums">{stat.value}</span>
            <span className="text-caption text-ink-muted">{stat.sub}</span>
          </Card>
        ))}
      </div>

      <ListCard
        label={t("Invite links")}
        footer={
          <p className="flex items-start gap-2 border-t border-divider bg-strip px-4 py-3 text-[13px] leading-[1.45] text-ink-soft md:px-5">
            <Info className="mt-0.5 size-3.75 shrink-0 text-ink-muted" aria-hidden="true" />
            {t("Make one link for each place you share, like your Facebook page or a YouTube video. Every link earns the same; separate links just show you which place brings paying people.")}
          </p>
        }
      >
        <ListHead columns={COLUMNS}>
          <ListHeadCell>{t("Link")}</ListHeadCell>
          <ListHeadCell align="end">{t("Clicks")}</ListHeadCell>
          <ListHeadCell align="end">{t("Joined")}</ListHeadCell>
          <ListHeadCell align="end">{t("Paying")}</ListHeadCell>
          <ListHeadCell align="end">{t("Earned")}</ListHeadCell>
          <ListHeadCell align="end">{t("Share")}</ListHeadCell>
        </ListHead>
        {links.map((link) => {
          const url = urlOf(link);
          return (
            <ListRow key={link.id} columns={COLUMNS} density="spacious">
              <ListCell className="flex min-w-0 flex-col gap-0.5 max-md:col-span-2">
                <span className="flex items-center gap-2 font-semibold text-ink">
                  <span className="truncate">{link.main ? t("Main link") : link.label}</span>
                  {link.main && <span className="shrink-0 rounded-full bg-surface-sunken px-1.75 py-px text-[11px] font-semibold text-ink-soft">{t("Main")}</span>}
                </span>
                <span className="truncate text-caption text-ink-muted">{linkText(url)}</span>
                <span className="text-caption text-ink-muted tabular-nums md:hidden">
                  {t("{clicks} clicks · {joined} joined · {paying} paying · {earned}", {
                    clicks: formatCount(link.clicks, fmt),
                    joined: formatCount(link.joined, fmt),
                    paying: formatCount(link.paying, fmt),
                    earned: money(link.earned),
                  })}
                </span>
              </ListCell>
              <ListCell align="end" className="text-ink-2 tabular-nums max-md:hidden">
                {formatCount(link.clicks, fmt)}
              </ListCell>
              <ListCell align="end" className="text-ink-2 tabular-nums max-md:hidden">
                {formatCount(link.joined, fmt)}
              </ListCell>
              <ListCell align="end" className="text-ink-2 tabular-nums max-md:hidden">
                {formatCount(link.paying, fmt)}
              </ListCell>
              <ListCell align="end" className="font-bold text-ink tabular-nums max-md:hidden">
                {money(link.earned)}
              </ListCell>
              <ListCell align="end" className="flex items-center justify-end gap-1.5 max-md:col-span-2 max-md:justify-start">
                <Button size="sm" onClick={() => copy(url, t("Link copied"))} className="rounded-full">
                  {t("Copy")}
                </Button>
                <button type="button" onClick={() => setQr(url)} aria-label={t("QR code for {name}", { name: link.main ? t("Main link") : link.label })} className="flex h-8 items-center justify-center rounded-full border border-line-strong px-2.5 text-[12.5px] font-semibold text-ink hover:bg-surface-sunken">
                  <QrCode className="size-3.75" aria-hidden="true" />
                  <span className="sr-only md:not-sr-only md:ml-1">QR</span>
                </button>
                {!link.main && (
                  <button type="button" onClick={() => setRemoving(link)} aria-label={t("Delete {name}", { name: link.label })} className="flex size-8 items-center justify-center rounded-full text-ink-muted hover:bg-expense-soft hover:text-expense">
                    <Trash2 className="size-3.75" aria-hidden="true" />
                  </button>
                )}
              </ListCell>
            </ListRow>
          );
        })}
      </ListCard>

      <NewLinkDialog
        open={creating}
        onClose={() => setCreating(false)}
        preview={(tag) => linkText(inviteLink(origin, code, tag))}
        onCreated={(next) => {
          setLinks(next);
          setCreating(false);
          toast.success(t("Link made. Copy it and share it there."));
        }}
      />
      <QrDialog open={qr !== null} onClose={() => setQr(null)} link={qr ?? ""} code={code} />
      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={remove}
        isPending={isRemoving}
        danger
        icon={<Trash2 />}
        title={t("Delete this link?")}
        description={removing ? t("{name} stops counting clicks. Friends who joined with it stay yours and keep earning you.", { name: removing.label }) : ""}
        confirmLabel={t("Delete link")}
        cancelLabel={t("Keep it")}
      />
    </PageFrame>
  );
}

// "New invite link": where it will be shared, and the short tag on the end
// of the link (made from the name until the member types their own).
function NewLinkDialog({ open, onClose, preview, onCreated }: { open: boolean; onClose: () => void; preview: (tag: string) => string; onCreated: (links: ReferralLink[]) => void }) {
  const { t } = useLocale();
  const [label, setLabel] = useState("");
  const [tag, setTag] = useState("");
  const [tagTouched, setTagTouched] = useState(false);
  const [error, setError] = useState<{ field: "label" | "tag" | "form"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const shownTag = tagTouched ? tag : cleanTag(label);

  function close() {
    setLabel("");
    setTag("");
    setTagTouched(false);
    setError(null);
    onClose();
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!label.trim()) return setError({ field: "label", message: t("Say where you will share it.") });
    if (!isTag(shownTag)) return setError({ field: "tag", message: t("Use 2 to 20 small letters and numbers.") });
    startTransition(async () => {
      const result = await createReferralLinkAction(label.trim(), shownTag).catch(() => null);
      if (result?.success && result.data) {
        onCreated(result.data);
        close();
      } else setError({ field: result?.status === 409 ? "tag" : "form", message: t(result?.message ?? "Couldn't make the link.") });
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent showCloseButton={false} className="w-110 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-[20px] border-0 bg-surface p-0 shadow-overlay ring-0">
        <form onSubmit={submit} noValidate>
          <div className="flex items-start justify-between gap-3 px-6 pt-5">
            <div className="flex flex-col gap-1">
              <DialogTitle className="text-h3 text-ink">{t("New invite link")}</DialogTitle>
              <DialogDescription className="text-small text-ink-muted">{t("Every link earns the same. Separate links show which place works.")}</DialogDescription>
            </div>
            <button type="button" onClick={close} aria-label={t("Close")} className="-mt-1 -mr-2 flex size-9 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink">
              <X className="size-4.5" aria-hidden="true" />
            </button>
          </div>
          <div className="flex flex-col gap-4 px-6 py-5">
            <Field label={t("Where will you share it?")} htmlFor="nl-label" error={error?.field === "label" ? error.message : undefined}>
              <Input
                id="nl-label"
                value={label}
                maxLength={40}
                onChange={(event) => {
                  setLabel(event.target.value);
                  if (error?.field !== "tag") setError(null);
                }}
                placeholder={t("e.g. Instagram bio")}
                invalid={error?.field === "label"}
              />
            </Field>
            <Field label={t("Short tag")} htmlFor="nl-tag" hint={t("Small letters and numbers only. It goes at the end of the link.")} error={error?.field === "tag" ? error.message : undefined}>
              <Input
                id="nl-tag"
                value={shownTag}
                onChange={(event) => {
                  setTagTouched(true);
                  setTag(cleanTag(event.target.value));
                  setError(null);
                }}
                placeholder={t("e.g. instagram")}
                invalid={error?.field === "tag"}
                autoCapitalize="none"
                spellCheck={false}
              />
            </Field>
            <div className="flex flex-col gap-1 rounded-field bg-strip px-3.5 py-2.5">
              <span className="flex items-center gap-1.5 text-caption text-ink-muted">
                <Link2 className="size-3.5" aria-hidden="true" />
                {t("Your new link")}
              </span>
              <span className="text-[13px] break-all text-ink">{preview(shownTag)}</span>
            </div>
            {error?.field === "form" && (
              <p role="alert" className="rounded-field bg-expense-soft px-3.5 py-2.5 text-small text-expense">
                {error.message}
              </p>
            )}
          </div>
          <div className="flex items-center justify-end gap-2.5 border-t border-line bg-strip px-6 py-3.5">
            <Button type="button" variant="secondary" onClick={close}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader size={16} onDark label={t("Loading...")} />}
              {t("Create link")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
