"use client";

import { BookOpen, Check, Pencil, Play, RotateCcw, Trash2, type LucideIcon } from "lucide-react";
import { useState } from "react";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Book, BookStatus } from "@/lib/customer/api";
import { instantText } from "@/lib/customer/habitDisplay";
import { pageOfText, progressPct, SHELF_LABEL, SHELVES } from "@/lib/customer/libraryDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { Cover } from "./Cover";

export type ShelfAction = "progress" | "finish" | "start" | "again" | "edit" | "remove";

interface ShelvesCardProps {
  shelves: Record<BookStatus, Book[]>;
  onAction: (book: Book, action: ShelfAction) => void;
}

interface MenuItem {
  action: ShelfAction;
  label: string;
  icon: LucideIcon;
}

const EDIT: MenuItem = { action: "edit", label: "Edit book", icon: Pencil };
const REMOVE: MenuItem = { action: "remove", label: "Remove book", icon: Trash2 };

// What can be done with a book, by the shelf it is on.
const MENU: Record<BookStatus, MenuItem[]> = {
  READING: [{ action: "progress", label: "Update progress", icon: BookOpen }, { action: "finish", label: "Mark as finished", icon: Check }, EDIT, REMOVE],
  WANT_TO_READ: [{ action: "start", label: "Start reading", icon: Play }, EDIT, REMOVE],
  FINISHED: [{ action: "again", label: "Read again", icon: RotateCcw }, EDIT, REMOVE],
};

const EMPTY: Record<BookStatus, string> = {
  READING: "Nothing on the go. Start one from Want to read.",
  WANT_TO_READ: "Add the book you want to read next.",
  FINISHED: "Nothing finished yet.",
};

// How many books a shelf shows before "See all".
const SHOWN = 3;

// The three shelves side by side. Every row opens a short menu of what can
// happen to that book.
export function ShelvesCard({ shelves, onAction }: ShelvesCardProps) {
  const { t, locale } = useLocale();
  const [expanded, setExpanded] = useState<Partial<Record<BookStatus, boolean>>>({});

  return (
    <Card padding="none" className="flex flex-col gap-3 rounded-md px-5 py-4">
      <h2 className="text-title font-semibold text-ink">{t("Shelves")}</h2>
      <div className="grid gap-5 md:grid-cols-3">
        {SHELVES.map((status) => {
          const books = shelves[status];
          const open = expanded[status] ?? false;
          const shown = open ? books : books.slice(0, SHOWN);
          return (
            <div key={status} className="flex min-w-0 flex-col gap-2">
              <div className="flex items-center justify-between border-b border-divider pb-1.5">
                <span className="text-[13.5px] font-semibold text-ink">{t(SHELF_LABEL[status])}</span>
                <Chip tone="neutral" className="h-4.5 px-2 text-ink-soft">
                  {formatCount(books.length, locale)}
                </Chip>
              </div>
              {shown.length === 0 && <span className="py-3 text-small text-ink-muted">{t(EMPTY[status])}</span>}
              {shown.map((book) => (
                <ShelfRow key={book.id} book={book} status={status} onAction={onAction} />
              ))}
              {books.length > SHOWN && (
                <button type="button" aria-expanded={open} onClick={() => setExpanded({ ...expanded, [status]: !open })} className="flex min-h-8 items-center self-start text-[12.5px] font-semibold text-emerald hover:underline pointer-coarse:min-h-11">
                  {open ? t("Show fewer") : t("See all {count}", { count: formatCount(books.length, locale) })}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ShelfRow({ book, status, onAction }: { book: Book; status: BookStatus; onAction: ShelvesCardProps["onAction"] }) {
  const { t, locale } = useLocale();
  const pages = t("{count} pages", { count: formatCount(book.totalPages, locale) });
  const detail = status === "READING" ? pageOfText(book, t, locale) : status === "WANT_TO_READ" ? pages : book.author ? "" : pages;
  const sub = [book.author, detail].filter(Boolean).join(" · ");
  const end = status === "READING" ? `${formatCount(progressPct(book), locale)}%` : status === "FINISHED" && book.finishedAt ? instantText(book.finishedAt, locale) : "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={t("{name}: actions", { name: book.title })} className="-mx-2 flex h-11 items-center gap-2.5 rounded-sm px-2 text-left transition-colors hover:bg-hover data-open:bg-hover">
        <Cover size="spine" title={book.title} color={book.color} />
        <span className="flex min-w-0 flex-1 flex-col gap-px">
          <span className="truncate text-[13.5px] font-medium text-ink">{book.title}</span>
          {sub && <span className="truncate text-caption text-ink-muted">{sub}</span>}
        </span>
        {/* The figure in ink: a cover colour is too faint to read as text. */}
        {end && <span className={cn("text-caption font-semibold whitespace-nowrap tabular-nums", status === "FINISHED" ? "text-income" : "text-ink-2")}>{end}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
        {MENU[status].map((item) => (
          <DropdownMenuItem key={item.action} onSelect={() => onAction(book, item.action)} className={item.action === "remove" ? "rounded-md px-3 py-2 text-body text-expense focus:bg-expense-soft focus:text-expense pointer-coarse:min-h-11" : "rounded-md px-3 py-2 text-body text-ink focus:bg-surface-sunken pointer-coarse:min-h-11"}>
            <item.icon className="size-4" aria-hidden="true" />
            {t(item.label)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

