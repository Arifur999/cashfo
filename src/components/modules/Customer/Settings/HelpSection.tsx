"use client";

import { BookOpen, ChevronDown, ChevronRight, CircleHelp, ExternalLink, MessageSquare, PlayCircle, Search, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import Button from "@/components/smartly/Button";
import Input from "@/components/smartly/form/Input";
import Kbd from "@/components/smartly/Kbd";
import PageFrame from "@/components/smartly/PageFrame";
import type { SupportConversation } from "@/lib/customer/api";
import { CATEGORY_LABEL, searchVideos, type HelpPageData } from "@/lib/customer/helpPage";
import { FAQS, searchFaqs } from "@/lib/customer/settingsDisplay";
import { getSupportMessagesAction } from "@/lib/customer/supportActions";
import { supportStatusOf, topicName, waitsOnYou } from "@/lib/customer/supportDisplay";
import { formatDate, formatRecentDateTime } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CARD } from "./boardUi";
import { HelpCompanyCards } from "./HelpCompanyCards";
import { HelpVideos } from "./HelpVideos";
import { IdeasDrawer } from "./IdeasDrawer";
import { SettingsBack } from "./SettingsBack";
import { SupportConversationDialog } from "./SupportConversationDialog";
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
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(openId ?? FAQS[0]?.id ?? null);
  const [helped, setHelped] = useState<Record<string, "yes" | "no">>({});
  const [conversations, setConversations] = useState(initialConversations);
  const [readingMessages, setReadingMessages] = useState(false);
  const found = (list: SupportConversation[] | null, id: string | undefined) => (id && list?.some((conversation) => conversation.id === id) ? id : null);
  const [selectedId, setSelectedId] = useState<string | null>(initialConversations === null ? (openMessageId ?? null) : found(initialConversations, openMessageId));
  const [mineFilter, setMineFilter] = useState<"all" | "active" | "solved">("all");
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

  const waiting = (conversations ?? []).filter(waitsOnYou).length;
  const isSolved = (conversation: SupportConversation) => conversation.status === "RESOLVED" || conversation.status === "CLOSED";
  const mine = (conversations ?? []).filter((conversation) => mineFilter === "all" || (mineFilter === "solved" ? isSolved(conversation) : !isSolved(conversation)));
  const selected = conversations?.find((conversation) => conversation.id === selectedId) ?? null;
  const tabs: { key: Tab; label: string; Icon: typeof PlayCircle; count?: number; dot?: boolean }[] = [
    { key: "videos", label: "Video guides", Icon: PlayCircle, count: query ? shownVideos.length : videos.length },
    { key: "questions", label: "Common questions", Icon: CircleHelp, count: query ? shownFaqs.length : FAQS.length },
    { key: "contact", label: "Contact us", Icon: Send },
    { key: "messages", label: "My messages", Icon: MessageSquare, count: conversations?.length, dot: waiting > 0 },
  ];

  return (
    <PageFrame className="gap-5 leading-[normal] md:pt-7 md:pb-10">
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
          <section aria-labelledby="hp-search" className={cn(CARD, "flex flex-col gap-3 bg-linear-135 from-soft-wash from-0% to-surface to-75% px-6 py-5.5")}>
            <div className="flex flex-col gap-0.75">
              <h2 id="hp-search" className="text-[19px] font-semibold text-ink">
                {t("How can we help?")}
              </h2>
              <p className="text-[13px] text-ink-muted">{t("Search the questions and video guides together.")}</p>
            </div>
            <Input
              ref={search}
              data-slash-search=""
              size="lg"
              frameClassName="h-13.5 rounded-[14px] pl-4 gap-3 [&_svg]:size-4.5"
              className="text-[15px] text-ellipsis max-md:placeholder:text-body"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("Search help, for example: void a transaction")}
              aria-label={t("Search help")}
              leading={<Search />}
              trailing={<Kbd className="mr-0.5 rounded-[6px] border-b-2 bg-strip px-2 font-sans text-[12px] font-semibold text-ink-muted pointer-coarse:hidden">/</Kbd>}
            />
            <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-muted">
              {t("Popular:")}
              {POPULAR.map((word) => (
                <button key={word} type="button" onClick={() => setQuery(t(word))} className="h-7.5 rounded-full border border-line bg-surface px-3 text-[12.5px] font-medium text-ink-2 hover:bg-soft-hover">
                  {t(word)}
                </button>
              ))}
            </div>
          </section>

          <div role="tablist" aria-label={t("Help & support")} className="flex gap-1 overflow-x-auto border-b border-line">
            {tabs.map(({ key, label, Icon, count, dot }) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={cn("relative flex h-10.5 shrink-0 items-center gap-1.75 px-3.5 text-body whitespace-nowrap", tab === key ? "font-semibold text-ink after:absolute after:inset-x-2.5 after:-bottom-px after:h-0.5 after:rounded-[2px] after:bg-primary" : "font-medium text-ink-muted hover:text-ink")}>
                <Icon className="size-4" aria-hidden="true" />
                {t(label)}
                {count !== undefined && <span className={cn("rounded-full px-1.75 text-[11.5px] leading-[18px] font-semibold", tab === key ? "bg-soft-wash text-emerald" : "bg-page text-ink-2")}>{formatCount(count, locale)}</span>}
                {dot && <span aria-label={t("Waiting for you")} className="size-1.75 rounded-full bg-info" />}
              </button>
            ))}
          </div>

          {tab === "videos" && (
            <div className={cn(CARD, "px-5 pt-4.5 pb-5")}>
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
              email={user.email}
              replyHours={help?.company?.replyHours ?? 0}
              onSent={keep}
              onView={(id) => {
                setTab("messages");
                setSelectedId(id);
              }}
            />
          </div>

          {tab === "messages" && (
            <section aria-labelledby="hp-mine" className={cn(CARD, "overflow-hidden")}>
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <h2 id="hp-mine" className="text-[16px] font-semibold text-ink">
                    {t("My messages")}
                  </h2>
                  <span className="text-[13px] text-ink-muted">{t("Everything you sent us and our replies.")}</span>
                </span>
                {conversations !== null && conversations.length > 0 && (
                  <div role="radiogroup" aria-label={t("My messages")} className="flex shrink-0 gap-0.5 rounded-full bg-page p-[3px]">
                    {(
                      [
                        ["all", "All", conversations.length],
                        ["active", "Active", conversations.filter((one) => !isSolved(one)).length],
                        ["solved", "Solved", conversations.filter(isSolved).length],
                      ] as const
                    ).map(([key, label, count]) => (
                      <button key={key} type="button" role="radio" aria-checked={mineFilter === key} onClick={() => setMineFilter(key)} className={cn("h-8 rounded-full px-3 text-[13px] whitespace-nowrap", mineFilter === key ? "bg-surface font-semibold text-ink shadow-[0_1px_2px_rgba(18,32,29,0.10)]" : "font-medium text-ink-2 hover:text-ink")}>
                        {t(label)} <span className="text-ink-faint">{formatCount(count, locale)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {conversations === null ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sunken px-5 py-4 text-small text-ink-muted">
                  {t("Couldn't load your messages.")}
                  <Button variant="secondary" size="sm" disabled={readingMessages} onClick={() => void readMessages()}>
                    {t("Try again")}
                  </Button>
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center gap-2.5 border-t border-sunken px-5 pt-8.5 pb-9.5 text-center">
                  <b className="text-[15px] font-semibold text-ink">{t("No messages yet")}</b>
                  <span className="text-[13px] text-ink-muted">{t("When you write to us, the conversation shows up here.")}</span>
                  <Button className="h-9.5 px-4 text-[13.5px]" onClick={() => messageUs()}>
                    {t("Message us")}
                  </Button>
                </div>
              ) : (
                <>
                  <div aria-hidden="true" className="hidden grid-cols-[74px_minmax(0,1fr)_150px_168px_16px] gap-3.5 border-y border-line bg-soft-row px-5 py-2 text-[12px] font-medium text-ink-muted @2xl:grid">
                    <span>{t("Ticket")}</span>
                    <span>{t("Subject")}</span>
                    <span>{t("Status")}</span>
                    <span>{t("Last update")}</span>
                    <span />
                  </div>
                  <ul>
                    {mine.map((conversation) => {
                      const status = supportStatusOf(conversation);
                      const last = conversation.messages.at(-1);
                      return (
                        <li key={conversation.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedId(conversation.id)}
                            className="grid min-h-16 w-full grid-cols-[minmax(0,1fr)_16px] items-center gap-x-3.5 gap-y-1 border-b border-sunken px-5 py-2.5 text-left hover:bg-soft-row @2xl:grid-cols-[74px_minmax(0,1fr)_150px_168px_16px]"
                          >
                            <span className="hidden items-center gap-1.5 @2xl:flex">
                              {waitsOnYou(conversation) && <span aria-label={t("New reply")} className="size-1.75 rounded-full bg-tint-blue-ink" />}
                              <span className="font-mono text-[12.5px] font-semibold text-ink-2">{conversation.number !== undefined ? `#${conversation.number}` : ""}</span>
                            </span>
                            <span className="flex min-w-0 flex-col gap-0.5">
                              <span className="flex min-w-0 items-center gap-2">
                                <span className="truncate text-body font-semibold text-ink">{conversation.subject}</span>
                                {conversation.priority === "URGENT" && <span className="shrink-0 rounded-full bg-loss-wash px-1.75 py-px text-[11px] font-semibold text-loss-ink">{t("Urgent")}</span>}
                              </span>
                              <span className="truncate text-[12px] text-ink-faint">
                                {t(topicName(conversation.category))} · {t("Opened {date}", { date: formatDate(conversation.createdAt, "d MMMM yyyy", "", locale) })}
                              </span>
                            </span>
                            <span className="hidden @2xl:block">
                              <span className={cn("inline-flex rounded-full px-2.25 py-0.5 text-[12px] font-semibold whitespace-nowrap", status.className)}>{t(status.label)}</span>
                            </span>
                            <span className="hidden min-w-0 flex-col gap-px @2xl:flex">
                              <span className="truncate text-[13px] text-ink-2">{formatRecentDateTime(conversation.updatedAt, { t, locale })}</span>
                              <span className="truncate text-[12px] text-ink-faint">{t(last?.senderType === "ADMIN" ? "Smartly replied" : "You wrote")}</span>
                            </span>
                            <ChevronRight className="size-4 text-ink-faint" aria-hidden="true" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </section>
          )}
        </div>

        <HelpCompanyCards company={help?.company ?? null} clock={clock} onIdea={() => setIdeasOpen(true)} />
      </div>

      <SupportConversationDialog conversation={selected} name={user.name} companyInitial={(help?.company?.name ?? "Smartly").slice(0, 1).toUpperCase()} onClose={() => setSelectedId(null)} onUpdated={keep} />
      <IdeasDrawer open={ideasOpen} onClose={() => setIdeasOpen(false)} />
    </PageFrame>
  );
}
