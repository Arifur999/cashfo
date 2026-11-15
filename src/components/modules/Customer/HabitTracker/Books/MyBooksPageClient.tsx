"use client";

import { BookOpen, Check, ChevronRight, Library, List, Pencil, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import PageFrame from "@/components/smartly/PageFrame";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import { useStoredChoice } from "@/components/modules/Customer/Balance/useStoredChoice";
import type { Book, BooksOverview, BookShelf, Reminder } from "@/lib/customer/api";
import { createBookShelfAction } from "@/lib/customer/bookActions";
import { formatCurrency } from "@/lib/customer/currency";
import { actionError, dayText } from "@/lib/customer/habitDisplay";
import { BUILT_IN_SHELVES, MY_BOOKS_HREF, shelfList, shelfNameProblem, shelfOf, type ShelfOption } from "@/lib/customer/libraryBoard";
import { isPaused } from "@/lib/customer/libraryDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { useReminderBook } from "../Reminders";
import { paletteFor } from "./bookPalette";
import { BookFormDialog } from "./BookFormDialog";
import { CoverArt, LB_ERROR, LB_FIELD, LB_OUTLINE, LB_PRIMARY } from "./LibraryBits";

type Tab = "all" | "reading" | "done" | "want";
type View = "shelf" | "list";
const VIEWS = ["shelf", "list"] as const;
const TABS: { value: Tab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "reading", label: "Reading" },
  { value: "done", label: "Finished" },
  { value: "want", label: "Want to read" },
];
// The board's three states; a paused book is still one being read.
const tabOf = (book: Book): Exclude<Tab, "all"> => (book.status === "READING" ? "reading" : book.status === "FINISHED" ? "done" : "want");
const ORDER: Record<Exclude<Tab, "all">, number> = { reading: 0, want: 1, done: 2 };
export const STATUS_CHIP: Record<"reading" | "paused" | "done" | "want", { label: string; chip: string; dot: string }> = {
  reading: { label: "Reading", chip: "bg-info-soft text-tint-blue-ink", dot: "bg-info" },
  paused: { label: "Paused", chip: "bg-warning-soft text-warning", dot: "bg-warning-fill" },
  done: { label: "Finished", chip: "bg-success-soft text-tint-green-ink", dot: "bg-success" },
  want: { label: "Want to read", chip: "bg-surface-sunken text-ink-soft", dot: "bg-ink-faint" },
};
export const chipOf = (book: Book) => STATUS_CHIP[isPaused(book) ? "paused" : tabOf(book)];
const LIST_COLUMNS = "grid-cols-[minmax(0,1fr)_120px_130px_90px_170px_40px]";

const hash = (text: string) => {
  let value = 0;
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(value);
};

interface MyBooksPageClientProps {
  overview: BooksOverview;
  reminders: Reminder[] | null;
  // ?add=1 opens the add form, ?shelf= shows one shelf.
  openAdd?: boolean;
  shelf?: string;
}

// My Library › My books (the LibraryBooks board): every book on its shelf,
// or as a list with the price, the notes and the last note; filtered by
// status, shelf and a search; books added here and shelves made here.
export function MyBooksPageClient({ overview, reminders: savedReminders, openAdd = false, shelf: startShelf }: MyBooksPageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const reminders = useReminderBook(savedReminders);
  const books = overview.books;
  const own = overview.shelves ?? [];
  const stats = overview.noteStats ?? {};
  const count = (n: number) => formatCount(n, fmt);
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useStoredChoice<View>("smartly-library-view", VIEWS, "shelf");
  const [shelfFilter, setShelfFilter] = useState(startShelf ?? "all");
  const [form, setForm] = useState<{ shelf?: string } | null>(openAdd ? {} : null);
  const [newShelfOpen, setNewShelfOpen] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);

  const shelves = shelfList(own);
  const filter = shelves.some((s) => s.id === shelfFilter) ? shelfFilter : "all";
  const needle = query.trim().toLowerCase();
  const counts: Record<Tab, number> = { all: books.length, reading: 0, done: 0, want: 0 };
  for (const book of books) counts[tabOf(book)]++;
  const shelfKey = (book: Book) => shelfOf(book.shelf, own).id;
  const lastOf = (book: Book) => stats[book.id]?.last || book.createdAt.slice(0, 10);
  const list = books
    .filter((book) => (tab === "all" || tabOf(book) === tab) && (filter === "all" || shelfKey(book) === filter) && (!needle || `${book.title} ${book.author}`.toLowerCase().includes(needle)))
    .sort((a, b) => ORDER[tabOf(a)] - ORDER[tabOf(b)] || lastOf(b).localeCompare(lastOf(a)));
  const shelfCount = new Map<string, number>();
  for (const book of books) shelfCount.set(shelfKey(book), (shelfCount.get(shelfKey(book)) ?? 0) + 1);
  const chips: (ShelfOption & { n: number })[] = [
    { id: "all", name: "All shelves", color: "", own: false, n: books.length },
    ...shelves.filter((s) => shelfCount.get(s.id) || s.own).map((s) => ({ ...s, n: shelfCount.get(s.id) ?? 0 })),
  ];
  const shelfName = (s: ShelfOption) => (s.own ? s.name : t(s.name));
  const totalNotes = Object.values(stats).reduce((sum, row) => sum + row.count, 0);
  const spent = books.reduce((sum, book) => sum + (book.price ?? 0), 0);
  const open = (book: Book) => router.push(`${MY_BOOKS_HREF}/${book.id}`);

  const clearAll = () => {
    setQuery("");
    setTab("all");
    setShelfFilter("all");
  };

  const noMatch = (
    <div className="flex flex-col items-center gap-2.5 px-5 py-12 text-center">
      <span className="text-[15px] font-semibold text-ink">{needle ? t("No book matches \"{query}\"", { query: query.trim() }) : t("No books here yet")}</span>
      <span className="text-[13.5px] text-ink-muted">{t("Try another word or show all books.")}</span>
      <button type="button" onClick={clearAll} className={cn(LB_OUTLINE, "h-9")}>
        {t("Show all books")}
      </button>
    </div>
  );

  const shelfRows = shelves
    .map((s) => ({ shelf: s, mine: list.filter((book) => shelfKey(book) === s.id) }))
    .filter((row) => row.mine.length > 0 || filter === row.shelf.id);

  return (
    <PageFrame className="gap-3.5 leading-[normal] md:pt-5 md:pb-5.5 xl:min-h-full">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-0.75">
          <h1 className="text-[24px] leading-[1.3] font-semibold tracking-[-0.02em] text-ink">{t("My books")}</h1>
          <p className="text-[14px] text-ink-muted">{t("Every book you have or want to read, with your notes from each one.")}</p>
        </div>
        <button type="button" onClick={() => setForm({ shelf: filter !== "all" ? filter : undefined })} className={LB_PRIMARY}>
          <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
          {t("Add book")}
        </button>
      </div>

      <section className="flex min-h-[560px] flex-1 flex-col overflow-hidden rounded-[14px] border border-line bg-surface shadow-card">
        {books.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3.5 p-10 text-center">
            <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-[18px] bg-emerald-soft">
              <BookOpen className="size-7.5 text-emerald" strokeWidth={1.8} />
            </span>
            <span className="text-[17px] font-semibold text-ink">{t("You have not added any books yet")}</span>
            <span className="max-w-95 text-[14px] text-ink-muted">{t("Add the books you are reading or want to read. Then keep notes page by page.")}</span>
            <button type="button" onClick={() => setForm({})} className={LB_PRIMARY}>
              <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
              {t("Add book")}
            </button>
          </div>
        ) : (
          <>
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3.5 border-b border-line px-4.5 py-3.5">
              <div role="tablist" aria-label={t("Show books")} className="inline-flex gap-0.5 rounded-full bg-surface-sunken p-0.75">
                {TABS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="tab"
                    aria-selected={tab === option.value}
                    onClick={() => setTab(option.value)}
                    className={cn("h-8.5 rounded-full px-3.5 text-[13.5px] font-semibold whitespace-nowrap", tab === option.value ? "bg-surface text-emerald shadow-[0_1px_3px_rgba(15,23,42,0.12)]" : "text-ink-soft hover:text-ink")}
                  >
                    {t(option.label)} <span className={cn("ml-1 font-medium", tab === option.value ? "text-emerald" : "text-ink-faint")}>{count(counts[option.value])}</span>
                  </button>
                ))}
              </div>
              <div className="relative ml-auto max-w-95 min-w-50 flex-1 max-md:ml-0">
                <Search className="pointer-events-none absolute top-3 left-3 size-4 text-ink-muted" aria-hidden="true" />
                <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Escape" && setQuery("")} placeholder={t("Search by book or author")} aria-label={t("Search by book or author")} className={cn(LB_FIELD, "h-10 pl-9")} />
              </div>
              <div role="radiogroup" aria-label={t("How to show books")} className="inline-flex shrink-0 rounded-[10px] bg-surface-sunken p-0.75">
                {VIEWS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={view === value}
                    onClick={() => setView(value)}
                    className={cn("inline-flex h-8.5 items-center gap-1.5 rounded-[8px] px-3 text-[13px] font-semibold", view === value ? "bg-surface text-emerald shadow-[0_1px_3px_rgba(15,23,42,0.12)]" : "text-ink-soft hover:text-ink")}
                  >
                    {value === "shelf" ? <Library className="size-3.75" aria-hidden="true" /> : <List className="size-3.75" aria-hidden="true" />}
                    {t(value === "shelf" ? "Shelf@@view" : "List")}
                  </button>
                ))}
              </div>
            </div>

            <div aria-label={t("Shelves@@books")} className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-line px-4.5 py-2.5">
              <span className="mr-0.5 shrink-0 text-[12.5px] font-semibold text-ink-muted">{t("Shelves@@books")}</span>
              {chips.map((chip) => {
                const on = filter === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setShelfFilter(chip.id)}
                    className={cn("inline-flex h-8 shrink-0 items-center gap-1.75 rounded-full border px-3 text-[13px] font-semibold whitespace-nowrap", on ? "border-primary bg-emerald-soft text-emerald" : "border-line bg-surface text-ink-2 hover:bg-hover")}
                  >
                    <span aria-hidden="true" className={cn("size-2 rounded-[2px]", chip.id === "all" && "bg-ink-faint")} style={chip.id === "all" ? undefined : { background: paletteFor(chip.color).from }} />
                    {chip.id === "all" ? t(chip.name) : shelfName(chip)}
                    <span className={cn("font-medium", on ? "text-emerald" : "text-ink-faint")}>{count(chip.n)}</span>
                  </button>
                );
              })}
              <button type="button" onClick={() => setNewShelfOpen(true)} className="h-8 shrink-0 rounded-full border border-dashed border-ink-faint bg-surface px-3 text-[13px] font-semibold whitespace-nowrap text-ink-soft hover:border-emerald hover:text-emerald">
                + {t("New shelf")}
              </button>
            </div>

            {view === "list" ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-x-auto">
                <div className="min-w-[760px]">
                  <div className={cn("grid shrink-0 items-center gap-x-4 border-b border-line bg-page px-4.5 py-2.25 text-[12px] font-semibold text-ink-muted", LIST_COLUMNS)}>
                    <span>{t("Book")}</span>
                    <span className="text-right">{t("Price")}</span>
                    <span>{t("Status")}</span>
                    <span className="text-right">{t("Notes")}</span>
                    <span>{t("Last note")}</span>
                    <span />
                  </div>
                  {list.length === 0
                    ? noMatch
                    : list.map((book) => {
                        const s = shelfOf(book.shelf, own);
                        const chip = chipOf(book);
                        const st = stats[book.id];
                        return (
                          <button
                            key={book.id}
                            type="button"
                            onClick={() => open(book)}
                            aria-label={t("Open {title}", { title: book.title })}
                            className={cn("grid w-full items-center gap-x-4 border-b border-divider px-4.5 py-3 text-left transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring", LIST_COLUMNS, highlight === book.id && "bg-emerald-soft")}
                          >
                            <span className="flex min-w-0 items-center gap-3.5">
                              <span aria-hidden="true" className="h-13.5 w-9.5 shrink-0 rounded-[3px_7px_7px_3px] shadow-[inset_4px_0_0_rgba(0,0,0,0.2)]" style={{ background: paletteFor(book.color).from }} />
                              <span className="flex min-w-0 flex-col gap-0.5">
                                <span className="truncate text-[15px] font-semibold text-ink">{book.title}</span>
                                <span className="truncate text-[13px] text-ink-muted">
                                  {book.author} ·{" "}
                                  <span className="font-semibold" style={{ color: paletteFor(s.color).from }}>
                                    {shelfName(s)}
                                  </span>
                                </span>
                              </span>
                            </span>
                            <span className={cn("text-right text-[14px] font-semibold tabular-nums", book.price == null ? "text-ink-faint" : "text-ink")}>{book.price == null ? "–" : formatCurrency(book.price, "BDT", fmt)}</span>
                            <span>
                              <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.75 text-[12.5px] font-semibold whitespace-nowrap", chip.chip)}>
                                <span aria-hidden="true" className={cn("size-1.5 rounded-full", chip.dot)} />
                                {t(chip.label)}
                              </span>
                            </span>
                            <span className={cn("text-right text-[14px] font-semibold tabular-nums", st?.count ? "text-ink" : "text-ink-faint")}>{count(st?.count ?? 0)}</span>
                            <span className={cn("text-[13.5px] whitespace-nowrap", st?.last ? "text-ink-2" : "text-ink-faint")}>{st?.last ? dayText(st.last, fmt, "dayMonthYY") : t("No notes yet")}</span>
                            <ChevronRight className="ml-auto size-4.5 text-ink-faint" aria-hidden="true" />
                          </button>
                        );
                      })}
                </div>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto bg-linear-to-b from-shelf-wall to-shelf-wall-end px-5 pt-4.5 pb-1.5">
                {shelfRows.length === 0
                  ? noMatch
                  : shelfRows.map(({ shelf: s, mine }) => (
                      <section key={s.id} aria-label={shelfName(s)} className="mb-6.5">
                        <div className="mb-2.5 flex items-center gap-2.5">
                          <span aria-hidden="true" className="h-5.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: paletteFor(s.color).from }} />
                          <h3 className="min-w-0 truncate text-[16px] font-bold text-shelf-ink">{shelfName(s)}</h3>
                          <span className="shrink-0 rounded-full bg-shelf-chip px-2.25 py-0.5 text-[12px] font-semibold whitespace-nowrap text-shelf-chip-ink">{t(mine.length === 1 ? "{count} book" : "{count} books", { count: count(mine.length) })}</span>
                          <span className="flex-1" />
                          <button type="button" onClick={() => setForm({ shelf: s.id })} className="h-7.5 shrink-0 rounded-[8px] px-2.5 text-[13px] font-semibold whitespace-nowrap text-emerald hover:bg-surface/60 max-sm:px-1">
                            + {t("Add a book here")}
                          </button>
                        </div>
                        <div className="relative rounded-[12px_12px_4px_4px] bg-linear-to-b from-shelf-back to-shelf-back-end shadow-[inset_0_10px_18px_-12px_rgba(80,55,30,0.35)]">
                          <div className="flex min-h-42 items-end gap-4.5 overflow-x-auto px-5.5 pt-5.5">
                            {mine.map((book) => {
                              const h = hash(book.id);
                              const chip = chipOf(book);
                              const notes = stats[book.id]?.count ?? 0;
                              const marked = book.status === "READING" && !isPaused(book);
                              const done = book.status === "FINISHED";
                              return (
                                <button
                                  key={book.id}
                                  type="button"
                                  onClick={() => open(book)}
                                  aria-label={t("Open {title}, {status}", { title: book.title, status: t(chip.label) })}
                                  title={[book.title, book.author, t(chip.label), notes ? t("{count} notes", { count: count(notes) }) : ""].filter(Boolean).join(" · ")}
                                  className={cn("relative shrink-0 text-left transition-transform duration-200 hover:-translate-y-1.5 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus-ring", highlight === book.id && "ring-2 ring-emerald ring-offset-2")}
                                  style={{ width: 100 + (h % 3) * 6, height: 142 + (h % 4) * 6 }}
                                >
                                  <CoverArt
                                    title={book.title}
                                    author={book.author}
                                    color={book.color}
                                    className="h-full w-full rounded-[3px_9px_9px_3px] pt-3.5 pr-2.5 pb-2.5 pl-4.5 shadow-[inset_7px_0_0_rgba(0,0,0,0.22),inset_9px_0_0_rgba(255,255,255,0.10),0_10px_14px_-6px_rgba(60,40,20,0.45)]"
                                    titleClassName={cn(book.title.length > 22 ? "text-[12px]" : "text-[13.5px]", (marked || done) && "pr-4")}
                                    authorClassName="text-[10.5px]"
                                  >
                                    {notes > 0 && (
                                      <span className="inline-flex h-4.5 items-center gap-0.75 self-start rounded-full bg-white/92 px-1.5 text-[10.5px] font-bold text-shelf-ink dark:bg-surface dark:text-white">
                                        <Pencil className="size-2.5" strokeWidth={2.5} aria-hidden="true" />
                                        {count(notes)}
                                      </span>
                                    )}
                                  </CoverArt>
                                  {marked && <span aria-hidden="true" className="absolute -top-0.75 right-3 h-6.5 w-3.5 bg-mark-yellow-edge [clip-path:polygon(0_0,100%_0,100%_100%,50%_78%,0_100%)]" />}
                                  {done && (
                                    <span aria-hidden="true" className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)]">
                                      <Check className="size-3 text-tint-green-ink" strokeWidth={3.5} />
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                            <button
                              type="button"
                              onClick={() => setForm({ shelf: s.id })}
                              aria-label={t("Add a book to {shelf}", { shelf: shelfName(s) })}
                              className="flex h-35 w-24 shrink-0 flex-col items-center justify-center gap-1.5 rounded-[3px_9px_9px_3px] border-2 border-dashed border-shelf-slot bg-surface/35 text-[12.5px] font-semibold text-shelf-slot-ink hover:border-emerald hover:bg-surface/70 hover:text-emerald"
                            >
                              <Plus className="size-5" strokeWidth={2.25} aria-hidden="true" />
                              {t("Add book")}
                            </button>
                          </div>
                          <div aria-hidden="true" className="-mx-1.5 h-4 rounded-[3px] bg-linear-to-b from-shelf-plank via-shelf-plank-mid to-shelf-plank-end shadow-[0_12px_16px_-8px_rgba(90,60,30,0.55)]" />
                        </div>
                      </section>
                    ))}
              </div>
            )}
            <div className="shrink-0 border-t border-line px-4.5 py-2.5 text-[12.5px] text-ink-muted">
              {t("{books} books · {notes} notes · {money} spent on books", { books: count(books.length), notes: count(totalNotes), money: formatCurrency(spent, "BDT", fmt) })}
            </div>
          </>
        )}
      </section>

      <BookFormDialog
        open={form !== null}
        onClose={() => setForm(null)}
        editing={null}
        shelves={own}
        startShelf={form?.shelf}
        reminders={reminders}
        onSaved={(book) => {
          setHighlight(book.id);
          setTab("all");
          setQuery("");
          if (shelfFilter !== "all" && shelfFilter !== book.shelf) setShelfFilter("all");
          if (book.status === "FINISHED") toast.success(t("Congratulations! Write a summary of the book now?"), { action: { label: t("Write summary"), onClick: () => router.push(`${MY_BOOKS_HREF}/${book.id}?summary=1`) } });
          else toast.success(t("Book added"), { action: { label: t("Open"), onClick: () => open(book) } });
        }}
      />
      <NewShelfDialog
        open={newShelfOpen}
        onClose={() => setNewShelfOpen(false)}
        own={own}
        onMade={(made) => {
          setShelfFilter(made.id);
          setView("shelf");
        }}
      />
    </PageFrame>
  );
}

// "New shelf": a name; then the page shows that shelf, empty, to add books to.
function NewShelfDialog({ open, onClose, own, onMade }: { open: boolean; onClose: () => void; own: BookShelf[]; onMade: (shelf: BookShelf) => void }) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setName("");
      setError("");
    }
  }

  function save() {
    if (isPending) return;
    const problem = shelfNameProblem(name, own, BUILT_IN_SHELVES.flatMap((s) => [s.name, t(s.name)]));
    if (problem) return setError(problem === "empty" ? t("Write a name for the shelf.") : t("A shelf with this name already exists."));
    startTransition(async () => {
      const result = await createBookShelfAction(name.trim());
      if (!result.success || !result.data) {
        setError(actionError(result.message, "Failed to make the shelf", t, fmt));
        return;
      }
      onClose();
      router.refresh();
      onMade(result.data);
      toast.success(t("Shelf made. Add books to it."));
    });
  }

  return (
    <PopupDialog
      open={open}
      onClose={onClose}
      busy={isPending}
      width={420}
      className="rounded-[16px] leading-[normal]" subClassName="leading-[normal]"
      headClassName="border-b-0 px-5.5 pt-4.5 pb-1.5"
      title={t("New shelf")}
      sub={<span className="text-[13px]">{t("A shelf is a group of books, like Religion or Novels.")}</span>}
      bodyClassName="gap-1.5 px-5.5 pt-3 pb-4.5"
      footerClassName="px-5.5"
      footer={
        <>
          <button type="button" onClick={onClose} disabled={isPending} className={LB_OUTLINE}>
            {t("Cancel")}
          </button>
          <button type="button" onClick={save} disabled={isPending} className={LB_PRIMARY}>
            {t("Make shelf")}
          </button>
        </>
      }
    >
      <input
        value={name}
        maxLength={40}
        autoFocus
        onChange={(event) => {
          setName(event.target.value);
          setError("");
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            save();
          }
        }}
        placeholder={t("Shelf name, e.g. Poetry")}
        aria-label={t("Shelf name, e.g. Poetry")}
        aria-invalid={!!error || undefined}
        className={LB_FIELD}
      />
      {error && <span className={LB_ERROR}>{error}</span>}
    </PopupDialog>
  );
}
