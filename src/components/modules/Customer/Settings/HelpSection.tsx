"use client";

import { BookOpen, ChevronDown, CircleHelp, ExternalLink, MessageSquare, MessagesSquare, PlayCircle, Search, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import Chip from "@/components/smartly/Chip";
import Input from "@/components/smartly/form/Input";
import Kbd from "@/components/smartly/Kbd";
import PageFrame from "@/components/smartly/PageFrame";
import type { SupportConversation } from "@/lib/customer/api";
import { CATEGORY_LABEL, searchVideos, type HelpPageData } from "@/lib/customer/helpPage";
import { FAQS, searchFaqs } from "@/lib/customer/settingsDisplay";
import { getSupportMessagesAction } from "@/lib/customer/supportActions";
import { SUPPORT_STATUS } from "@/lib/customer/supportDisplay";
import { formatRecentDateTime } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CARD } from "./boardUi";
import { HelpCompanyCards } from "./HelpCompanyCards";
import { HelpVideos } from "./HelpVideos";
import { IdeasDrawer } from "./IdeasDrawer";
import { MessagesDrawer } from "./MessagesDrawer";
import { SettingsBack } from "./SettingsBack";
import { SupportMessageCard, type SupportMessageHandle } from "./SupportMessageCard";

interface HelpSectionProps {
  // A question to open on arrival, from a guide.
  openId?: string;
  // A conversation to open on arrival, from the bell or a reply email.
  openMessageId?: string;
  // The customer's messages to support, read by the page; null when they
  // couldn't be read (the list then offers Try again).
  conversations: SupportConversation[] | null;
  // The company card and the video guides (Admin › Settings); null when
  // they couldn't be read.
  help: HelpPageData | null;
  // The Dhaka clock when the page was read, for Open now / Closed now.
  clock: { day: number; minutes: number };
}

type Tab = "videos" | "questions" | "contact" | "messages";

const POPULAR = ["void a transaction", "budget", "bKash", "two-step sign-in"];
// Yes / No under an answer: 30px for a mouse, 44px under a finger.
const PILL = "h-7 rounded-full border border-input bg-surface px-2.5 text-[12.5px] font-semibold text-ink hover:bg-surface-sunken pointer-coarse:h-11 pointer-coarse:px-4";
const TEXT_BUTTON = "inline-flex items-center rounded-sm font-semibold text-emerald hover:underline pointer-coarse:min-h-11";

// The SettingsHelp board: one search over the questions and the video
// guides; tabs for the guides, the questions, writing to the team and the
// person's messages; beside them how to reach the company. A video opens
// in the player, a message in its conversation.
export function HelpSection({ openId, openMessageId, conversations: initialConversations, help, clock }: HelpSectionProps) {
  const { t, locale } = useLocale();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(openId ?? FAQS[0]?.id ?? null);
  const [helped, setHelped] = useState<Record<string, "yes" | "no">>({});
  const [conversations, setConversations] = useState(initialConversations);
  const [readingMessages, setReadingMessages] = useState(false);
  const found = (list: SupportConversation[] | null, id: string | undefined) => (id && list?.some((conversation) => conversation.id === id) ? id : null);
  const [messagesOpen, setMessagesOpen] = useState(found(initialConversations, openMessageId) !== null || (initialConversations === null && Boolean(openMessageId)));
  const [selectedId, setSelectedId] = useState<string | null>(initialConversations === null ? (openMessageId ?? null) : found(initialConversations, openMessageId));
  const [ideasOpen, setIdeasOpen] = useState(false);
  const videos = help?.videos ?? [];
  const [tab, setTab] = useState<Tab>(openId ? "questions" : openMessageId ? "messages" : videos.length > 0 ? "videos" : "questions");
  const messageCard = useRef<SupportMessageHandle>(null);
  const search = useRef<HTMLInputElement>(null);
  const shownFaqs = searchFaqs(FAQS, query, t);
  const shownVideos = searchVideos(videos, query, locale === "bn", (category) => t(CATEGORY_LABEL[category] ?? "Other"));

  const missing = Boolean(openMessageId) && initialConversations !== null && found(initialConversations, openMessageId) === null;
  const toldMissing = useRef(false);
  useEffect(() => {
    if (!missing || toldMissing.current) return;
    toldMissing.current = true;
    toast.error(t("That conversation couldn't be opened"));
  }, [missing, t]);

  // "/" puts the cursor in the search.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key !== "/" || target?.closest("input, textarea, select, [contenteditable]")) return;
      event.preventDefault();
      search.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function readMessages() {
    setReadingMessages(true);
    try {
      const result = await getSupportMessagesAction();
      if (!result.success) return;
      const list = result.data ?? [];
      setConversations(list);
      if (openMessageId && selectedId === openMessageId && !found(list, openMessageId)) {
        setSelectedId(null);
        toast.error(t("That conversation couldn't be opened"));
      }
    } catch {
      // Still unread: the list keeps its Try again.
    } finally {
      setReadingMessages(false);
    }
  }

  function keep(conversation: SupportConversation) {
    if (conversations === null) return void readMessages();
    setConversations((current) => (current === null ? current : [conversation, ...current.filter((row) => row.id !== conversation.id)]));
  }

  // "Message us": the Contact us tab, the box ready to type in.
  function messageUs(about?: string) {
    setTab("contact");
    window.setTimeout(() => messageCard.current?.start(about), 50);
  }

  const waiting = (conversations ?? []).filter((conversation) => conversation.status === "WAITING_ON_USER").length;
  const tabs: { key: Tab; label: string; Icon: typeof PlayCircle; count?: number; dot?: boolean }[] = [
    { key: "videos", label: "Video guides", Icon: PlayCircle, count: query ? shownVideos.length : videos.length },
    { key: "questions", label: "Common questions", Icon: CircleHelp, count: query ? shownFaqs.length : FAQS.length },
    { key: "contact", label: "Contact us", Icon: Send },
    { key: "messages", label: "My messages", Icon: MessageSquare, count: conversations?.length, dot: waiting > 0 },
  ];

  return (
    <PageFrame className="gap-5.5 leading-[normal]">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <SettingsBack />
          <h1 className="text-[26px] leading-[1.3] font-semibold tracking-[-0.02em] text-ink">{t("Help & support")}</h1>
          <p className="text-body text-ink-muted">{t("Watch a guide, find a quick answer or write to our team.")}</p>
        </div>
        <Button size="sm" className="h-10 px-4 text-body" onClick={() => messageUs()}>
          <MessageSquare className="size-4" aria-hidden="true" />
          {t("Message us")}
        </Button>
      </div>
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="@container flex min-w-0 flex-col gap-4.5">
          <section aria-labelledby="hp-search" className={cn(CARD, "flex flex-col gap-3.5 px-6 py-5")}>
            <div className="flex flex-col gap-0.75">
              <h2 id="hp-search" className="text-[19px] font-semibold text-ink">
                {t("How can we help?")}
              </h2>
              <p className="text-small text-ink-muted">{t("Search the questions and video guides together.")}</p>
            </div>
            <Input
              ref={search}
              size="lg"
              frameClassName="rounded-[12px]"
              className="text-[15px] text-ellipsis max-md:placeholder:text-body"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("Search help, for example: void a transaction")}
              aria-label={t("Search help")}
              leading={<Search />}
              trailing={<Kbd className="rounded-[6px] border-b-2 bg-strip font-sans text-caption font-semibold text-ink pointer-coarse:hidden">/</Kbd>}
            />
            <div className="flex flex-wrap items-center gap-2 text-small text-ink-muted">
              {t("Popular:")}
              {POPULAR.map((word) => (
                <button key={word} type="button" onClick={() => setQuery(t(word))} className="h-8 rounded-full border border-line bg-surface px-3 text-small font-medium text-ink-2 hover:bg-surface-sunken">
                  {t(word)}
                </button>
              ))}
            </div>
          </section>

          <div role="tablist" aria-label={t("Help & support")} className="flex gap-1 overflow-x-auto border-b border-line">
            {tabs.map(({ key, label, Icon, count, dot }) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={cn("-mb-px flex h-11 shrink-0 items-center gap-2 border-b-2 px-3.5 text-body font-medium whitespace-nowrap", tab === key ? "border-primary text-ink" : "border-transparent text-ink-soft hover:text-ink")}>
                <Icon className="size-4" aria-hidden="true" />
                {t(label)}
                {count !== undefined && <span className={cn("text-small font-semibold", tab === key ? "text-primary" : "text-ink-muted")}>{formatCount(count, locale)}</span>}
                {dot && <span aria-label={t("Waiting for you")} className="size-1.75 rounded-full bg-info" />}
              </button>
            ))}
          </div>

          {tab === "videos" && (
            <div className={cn(CARD, "px-5.5 py-5")}>
              <HelpVideos videos={shownVideos} all={videos} />
            </div>
          )}

          {tab === "questions" && (
            <section aria-labelledby="hp-faq" className={cn(CARD, "overflow-hidden")}>
              <h2 id="hp-faq" className="px-5.5 py-4 text-[16px] font-semibold text-ink">
                {t("Common questions")}
              </h2>
              {shownFaqs.length === 0 && (
                <p className="border-t border-divider px-5.5 py-6 text-small text-ink-muted">
                  {t("Nothing matches. Try other words.")}{" "}
                  <button type="button" onClick={() => messageUs(query)} className={TEXT_BUTTON}>
                    {t("Send us a message")}
                  </button>
                </p>
              )}
              {shownFaqs.map((faq) => {
                const expanded = open === faq.id;
                const answer = helped[faq.id];
                return (
                  <div key={faq.id} className={cn("border-t border-divider", expanded && "bg-emerald-soft/60")}>
                    <button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : faq.id)} className="flex min-h-13 w-full items-center gap-3 px-5.5 py-2 text-left focus-visible:-outline-offset-2">
                      <span className={cn("flex-1 text-body font-semibold", expanded ? "text-emerald" : "text-ink")}>{t(faq.question)}</span>
                      <ChevronDown className={cn("size-4 shrink-0 transition-transform motion-reduce:transition-none", expanded ? "rotate-180 text-emerald" : "text-ink-muted")} aria-hidden="true" />
                    </button>
                    {expanded && (
                      <div className="flex flex-col gap-2.5 px-5.5 pb-4">
                        <p className="text-[13.5px] leading-[1.6] text-ink-2">{t(faq.answer)}</p>
                        {answer ? (
                          <span role="status" className="text-small text-ink-muted">
                            {answer === "yes" ? (
                              t("Glad it helped.")
                            ) : (
                              <>
                                {t("Sorry about that.")}{" "}
                                <button type="button" onClick={() => messageUs(t(faq.question))} className={TEXT_BUTTON}>
                                  {t("Send us a message")}
                                </button>
                              </>
                            )}
                          </span>
                        ) : (
                          <span className="flex flex-wrap items-center gap-3 text-[12.5px] text-ink-muted">
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
              <a href="/faq" target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-2 border-t border-divider px-5.5 text-small font-semibold text-emerald hover:underline focus-visible:-outline-offset-2">
                <BookOpen className="size-4" aria-hidden="true" />
                {t("More answers in the FAQ")}
                <ExternalLink className="size-3.5" aria-hidden="true" />
                <span className="sr-only">({t("opens in a new tab")})</span>
              </a>
            </section>
          )}

          {/* Kept mounted, so "Message us" can bring its box into view. */}
          <div className={cn(tab !== "contact" && "hidden")}>
            <SupportMessageCard
              ref={messageCard}
              conversations={conversations === null ? null : conversations.length}
              onSent={keep}
              onOpenMessages={() => {
                setTab("messages");
              }}
            />
          </div>

          {tab === "messages" && (
            <section aria-labelledby="hp-msg" className={cn(CARD, "overflow-hidden")}>
              <div className="flex flex-col gap-0.75 px-5.5 pt-4.5 pb-3.5">
                <h2 id="hp-msg" className="text-[16px] font-semibold text-ink">
                  {t("My messages")}
                </h2>
                <p className="text-small text-ink-muted">{t("Everything you wrote to us, and our replies.")}</p>
              </div>
              {conversations === null ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider px-5.5 py-4 text-small text-ink-muted">
                  {t("Couldn't load your messages.")}
                  <Button variant="secondary" size="sm" disabled={readingMessages} onClick={() => void readMessages()}>
                    {t("Try again")}
                  </Button>
                </div>
              ) : conversations.length === 0 ? (
                <p className="border-t border-divider px-5.5 py-6 text-small text-ink-muted">
                  {t("No messages yet.")}{" "}
                  <button type="button" onClick={() => messageUs()} className={TEXT_BUTTON}>
                    {t("Send us a message")}
                  </button>
                </p>
              ) : (
                <ul>
                  {conversations.map((conversation) => {
                    const status = SUPPORT_STATUS[conversation.status];
                    return (
                      <li key={conversation.id} className="border-t border-divider">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(conversation.id);
                            setMessagesOpen(true);
                          }}
                          className="flex w-full items-center gap-3.5 px-5.5 py-3 text-left hover:bg-surface-sunken/60"
                        >
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-surface-sunken text-ink-soft">
                            <MessagesSquare className="size-4" aria-hidden="true" />
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="truncate text-body font-semibold text-ink">{conversation.subject}</span>
                            <span className="text-[12.5px] text-ink-muted">{formatRecentDateTime(conversation.updatedAt, { t, locale })}</span>
                          </span>
                          <Chip tone={status.tone} size="sm">
                            {t(status.label)}
                          </Chip>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}
        </div>

        <HelpCompanyCards company={help?.company ?? null} clock={clock} onIdea={() => setIdeasOpen(true)} />
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
    </PageFrame>
  );
}
