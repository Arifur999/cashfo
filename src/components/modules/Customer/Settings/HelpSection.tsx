"use client";

import { ChevronDown, Lightbulb, Search } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import Card from "@/components/smartly/Card";
import Input from "@/components/smartly/form/Input";
import type { SupportConversation } from "@/lib/customer/api";
import { FAQS, searchFaqs, SHORTCUTS } from "@/lib/customer/settingsDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { IdeasDrawer } from "./IdeasDrawer";
import { MessagesDrawer } from "./MessagesDrawer";
import { SupportMessageCard } from "./SupportMessageCard";

interface HelpSectionProps {
  // A question to open on arrival, from a guide.
  openId?: string;
  // A conversation to open on arrival, from the bell or a reply email.
  openMessageId?: string;
  // The customer's messages to support, read by the page.
  conversations: SupportConversation[];
}

const PILL = "h-7.5 rounded-full border border-line-strong bg-surface px-3 text-small font-semibold text-ink-2 hover:bg-cream";

// The questions people ask most, searchable; a message to support with a
// screenshot; ideas to vote on; and the shortcuts.
export function HelpSection({ openId, openMessageId, conversations: initialConversations }: HelpSectionProps) {
  const { t } = useLocale();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(openId ?? FAQS[0]?.id ?? null);
  // "yes" or "no" per question answered "Did this help?".
  const [helped, setHelped] = useState<Record<string, "yes" | "no">>({});
  const [conversations, setConversations] = useState(initialConversations);
  const opening = openMessageId && initialConversations.some((conversation) => conversation.id === openMessageId) ? openMessageId : null;
  const [messagesOpen, setMessagesOpen] = useState(opening !== null);
  const [selectedId, setSelectedId] = useState<string | null>(opening);
  const [ideasOpen, setIdeasOpen] = useState(false);
  const shown = searchFaqs(FAQS, query, t);

  // A new or answered conversation goes to the top.
  function keep(conversation: SupportConversation) {
    setConversations((current) => [conversation, ...current.filter((row) => row.id !== conversation.id)]);
  }

  return (
    <div className="flex flex-col gap-4">
      <Input size="xl" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Search help, for example: void a transaction")} aria-label={t("Search help")} leading={<Search />} />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
        <Card padding="none" className="overflow-hidden">
          <h2 className="px-5 py-4 text-title font-semibold text-ink">{t("Common questions")}</h2>
          {shown.length === 0 && <div className="border-t border-surface-sunken px-5 py-6 text-small text-ink-muted">{t("Nothing matches. Try other words.")}</div>}
          {shown.map((faq) => {
            const expanded = open === faq.id;
            const answer = helped[faq.id];
            return (
              <div key={faq.id} className={cn("border-t border-surface-sunken", expanded && "bg-mint-50/50")}>
                <button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : faq.id)} className="flex min-h-13 w-full items-center gap-3 px-5 text-left">
                  <span className={cn("flex-1 text-body font-semibold", expanded ? "text-emerald" : "text-ink")}>{t(faq.question)}</span>
                  <ChevronDown className={cn("size-4.5 shrink-0 text-ink-muted transition-transform", expanded && "rotate-180")} aria-hidden="true" />
                </button>
                {expanded && (
                  <div className="flex flex-col gap-3 px-5 pb-4">
                    <p className="text-body leading-relaxed text-ink-2">{t(faq.answer)}</p>
                    {answer ? (
                      <span role="status" className="text-small text-ink-muted">
                        {t(answer === "yes" ? "Thanks for telling us." : "Sorry about that. Send us a message and we'll help.")}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-small text-ink-muted">
                        {t("Did this help?")}
                        <button type="button" onClick={() => setHelped((current) => ({ ...current, [faq.id]: "yes" }))} className={PILL}>
                          {t("Yes")}
                        </button>
                        <button type="button" onClick={() => setHelped((current) => ({ ...current, [faq.id]: "no" }))} className={PILL}>
                          {t("No")}
                        </button>
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </Card>

        <div className="flex flex-col gap-4">
          <SupportMessageCard
            email={user.email}
            conversations={conversations.length}
            onSent={keep}
            onOpenMessages={() => {
              setSelectedId(null);
              setMessagesOpen(true);
            }}
          />
          <Card padding="none" elevated={false} className="flex gap-3 p-4">
            <span className="flex size-8.5 shrink-0 items-center justify-center rounded-md bg-warning-soft text-warning">
              <Lightbulb className="size-4" aria-hidden="true" />
            </span>
            <span className="flex flex-col gap-2">
              <h2 className="text-body font-semibold text-ink">{t("Have an idea?")}</h2>
              <span className="text-small leading-normal text-ink-muted">{t("Suggest a feature and vote on what others asked for.")}</span>
              <button type="button" onClick={() => setIdeasOpen(true)} className="w-fit text-small font-semibold text-emerald hover:underline">
                {t("Share an idea")}
              </button>
            </span>
          </Card>
          <Card padding="none" elevated={false} className="flex flex-col gap-3 p-4">
            <h2 className="text-body font-semibold text-ink">{t("Keyboard shortcuts")}</h2>
            {SHORTCUTS.map((shortcut) => (
              <span key={shortcut.key} className="flex items-center justify-between text-small text-ink-2">
                {t(shortcut.what)}
                <kbd className="rounded-sm border border-b-2 border-line bg-strip px-2 py-0.5 font-sans text-caption font-semibold text-ink">{shortcut.key}</kbd>
              </span>
            ))}
          </Card>
        </div>
      </div>

      <MessagesDrawer open={messagesOpen} conversations={conversations} selectedId={selectedId} onSelect={setSelectedId} onClose={() => setMessagesOpen(false)} onUpdated={keep} />
      <IdeasDrawer open={ideasOpen} onClose={() => setIdeasOpen(false)} />
    </div>
  );
}
