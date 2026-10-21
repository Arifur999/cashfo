"use client";

import { BookOpen, ChevronDown, ExternalLink, Lightbulb, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import Card from "@/components/smartly/Card";
import Input from "@/components/smartly/form/Input";
import IconTile from "@/components/smartly/IconTile";
import Kbd from "@/components/smartly/Kbd";
import type { SupportConversation } from "@/lib/customer/api";
import { FAQS, searchFaqs, SHORTCUTS } from "@/lib/customer/settingsDisplay";
import { getSupportMessagesAction } from "@/lib/customer/supportActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { IdeasDrawer } from "./IdeasDrawer";
import { MessagesDrawer } from "./MessagesDrawer";
import { SupportMessageCard, type SupportMessageHandle } from "./SupportMessageCard";

interface HelpSectionProps {
  // A question to open on arrival, from a guide.
  openId?: string;
  // A conversation to open on arrival, from the bell or a reply email.
  openMessageId?: string;
  // The customer's messages to support, read by the page; null when they
  // couldn't be read (the drawer then offers Try again).
  conversations: SupportConversation[] | null;
}

// Yes / No under an answer: 30px for a mouse, 44px under a finger.
const PILL = "h-7.5 rounded-full border border-line-strong bg-surface px-3 text-small font-semibold text-ink-2 hover:bg-surface-sunken pointer-coarse:h-11 pointer-coarse:px-4";
// A link-styled button, in a sentence or under one: 44px tall under a finger.
const TEXT_BUTTON = "inline-flex items-center rounded-sm font-semibold text-emerald hover:underline pointer-coarse:min-h-11";
// Under a card's text: the 44px box overlaps the gap and the padding, so a
// finger gets its hit area without the link floating below the words.
const CARD_LINK = "w-fit text-small pointer-coarse:-my-3";

// The questions people ask most, searchable; a message to support with a
// screenshot; ideas to vote on; the full FAQ; and the shortcuts.
export function HelpSection({ openId, openMessageId, conversations: initialConversations }: HelpSectionProps) {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(openId ?? FAQS[0]?.id ?? null);
  // "yes" or "no" per question answered "Did this help?". Kept on this
  // page only, so the thanks doesn't claim it was recorded.
  const [helped, setHelped] = useState<Record<string, "yes" | "no">>({});
  const [conversations, setConversations] = useState(initialConversations);
  const [readingMessages, setReadingMessages] = useState(false);
  const found = (list: SupportConversation[] | null, id: string | undefined) => (id && list?.some((conversation) => conversation.id === id) ? id : null);
  // A ?message= link opens its conversation, or, while the messages
  // couldn't be read, the drawer with Try again.
  const [messagesOpen, setMessagesOpen] = useState(found(initialConversations, openMessageId) !== null || (initialConversations === null && Boolean(openMessageId)));
  // Unread, the link's conversation waits to be opened once they are.
  const [selectedId, setSelectedId] = useState<string | null>(initialConversations === null ? (openMessageId ?? null) : found(initialConversations, openMessageId));
  const [ideasOpen, setIdeasOpen] = useState(false);
  const messageCard = useRef<SupportMessageHandle>(null);
  const shown = searchFaqs(FAQS, query, t);

  // A link to a conversation this account doesn't have (or no longer has)
  // says so, once, rather than opening nothing.
  const missing = Boolean(openMessageId) && initialConversations !== null && found(initialConversations, openMessageId) === null;
  const toldMissing = useRef(false);
  useEffect(() => {
    if (!missing || toldMissing.current) return;
    toldMissing.current = true;
    toast.error(t("That conversation couldn't be opened"));
  }, [missing, t]);

  async function readMessages() {
    setReadingMessages(true);
    try {
      const result = await getSupportMessagesAction();
      if (!result.success) return;
      const list = result.data ?? [];
      setConversations(list);
      // The conversation the link asked for, now that the list is here.
      if (openMessageId && selectedId === openMessageId && !found(list, openMessageId)) {
        setSelectedId(null);
        toast.error(t("That conversation couldn't be opened"));
      }
    } catch {
      // Still unread: the drawer keeps its Try again.
    } finally {
      setReadingMessages(false);
    }
  }

  // A new or answered conversation goes to the top. Sent while the list
  // couldn't be read, the list is read again instead, so it is whole.
  function keep(conversation: SupportConversation) {
    if (conversations === null) {
      void readMessages();
      return;
    }
    setConversations((current) => (current === null ? current : [conversation, ...current.filter((row) => row.id !== conversation.id)]));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* On a phone the example is set a size down (the typed text keeps
          16px, so iOS doesn't zoom) and ends with an ellipsis if it still
          doesn't fit, rather than being cut mid-word. */}
      <Input size="xl" className="text-ellipsis max-md:placeholder:text-body" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Search help, for example: void a transaction")} aria-label={t("Search help")} leading={<Search />} />
      {/* Two columns once the section itself is 672px wide: from 1024px the
          sidebar and the rail leave it far less than the window. */}
      <div className="grid items-start gap-4 @2xl:grid-cols-[minmax(0,1fr)_330px]">
        <Card padding="none" className="overflow-hidden">
          <h2 className="px-5 py-4 text-title font-semibold text-ink">{t("Common questions")}</h2>
          {shown.length === 0 && (
            <p className="border-t border-divider px-5 py-6 text-small text-ink-muted">
              {t("Nothing matches. Try other words.")}{" "}
              <button type="button" onClick={() => messageCard.current?.start(query)} className={TEXT_BUTTON}>
                {t("Send us a message")}
              </button>
            </p>
          )}
          {shown.map((faq) => {
            const expanded = open === faq.id;
            const answer = helped[faq.id];
            return (
              <div key={faq.id} className={cn("border-t border-divider", expanded && "bg-mint-50/50")}>
                {/* The ring is drawn inside: the card's clip would cut it at the edges. */}
                <button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : faq.id)} className="flex min-h-13 w-full items-center gap-3 px-5 py-2 text-left focus-visible:-outline-offset-2">
                  <span className={cn("flex-1 text-body font-semibold", expanded ? "text-emerald" : "text-ink")}>{t(faq.question)}</span>
                  <ChevronDown className={cn("size-4.5 shrink-0 text-ink-muted transition-transform motion-reduce:transition-none", expanded && "rotate-180")} aria-hidden="true" />
                </button>
                {expanded && (
                  <div className="flex flex-col gap-3 px-5 pb-4">
                    <p className="text-body leading-relaxed text-ink-2">{t(faq.answer)}</p>
                    {answer ? (
                      <span role="status" className="text-small text-ink-muted">
                        {answer === "yes" ? (
                          t("Glad it helped.")
                        ) : (
                          <>
                            {t("Sorry about that.")}{" "}
                            <button type="button" onClick={() => messageCard.current?.start(t(faq.question))} className={TEXT_BUTTON}>
                              {t("Send us a message")}
                            </button>
                          </>
                        )}
                      </span>
                    ) : (
                      <span className="flex flex-wrap items-center gap-2 text-small text-ink-muted">
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
            ref={messageCard}
            conversations={conversations === null ? null : conversations.length}
            onSent={keep}
            onOpenMessages={() => {
              setSelectedId(null);
              setMessagesOpen(true);
            }}
          />
          <Card padding="none" elevated={false} className="flex gap-3 p-4">
            <IconTile tone="warning" size={36}>
              <Lightbulb />
            </IconTile>
            <span className="flex min-w-0 flex-col gap-2">
              <h2 className="text-body font-semibold text-ink">{t("Have an idea?")}</h2>
              <span className="text-small leading-normal text-ink-muted">{t("Suggest a feature and vote on what others asked for.")}</span>
              <button type="button" onClick={() => setIdeasOpen(true)} className={cn(CARD_LINK, TEXT_BUTTON)}>
                {t("Share an idea")}
              </button>
            </span>
          </Card>
          {/* Admin › Content keeps the full list of answers on /faq. */}
          <Card padding="none" elevated={false} className="flex gap-3 p-4">
            <IconTile tone="info" size={36}>
              <BookOpen />
            </IconTile>
            <span className="flex min-w-0 flex-col gap-2">
              <h2 className="text-body font-semibold text-ink">{t("More answers")}</h2>
              <span className="text-small leading-normal text-ink-muted">{t("Every question we have answered, kept up to date.")}</span>
              <a href="/faq" target="_blank" rel="noopener noreferrer" className={cn(CARD_LINK, "gap-1", TEXT_BUTTON)}>
                {t("Open the FAQ")}
                <ExternalLink className="size-3.5" aria-hidden="true" />
                <span className="sr-only">({t("opens in a new tab")})</span>
              </a>
            </span>
          </Card>
          {/* The shortcuts need a keyboard: a phone or tablet has none to press. */}
          <Card padding="none" elevated={false} className="flex flex-col gap-3 p-4 pointer-coarse:hidden">
            <h2 className="text-body font-semibold text-ink">{t("Keyboard shortcuts")}</h2>
            {SHORTCUTS.map((shortcut) => (
              <span key={shortcut.key} className="flex items-center justify-between gap-3 text-small text-ink-2">
                {t(shortcut.what)}
                <Kbd>{shortcut.key}</Kbd>
              </span>
            ))}
          </Card>
        </div>
      </div>

      <MessagesDrawer
        open={messagesOpen}
        conversations={conversations}
        reading={readingMessages}
        onRetry={() => void readMessages()}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onClose={() => setMessagesOpen(false)}
        onUpdated={keep}
      />
      <IdeasDrawer open={ideasOpen} onClose={() => setIdeasOpen(false)} />
    </div>
  );
}
