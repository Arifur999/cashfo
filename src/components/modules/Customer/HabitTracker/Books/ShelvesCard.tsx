"use client";

import { BookOpen, Check, Pencil, Play, RotateCcw, Trash2, type LucideIcon } from "lucide-react";
import { useState } from "react";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Book, BookStatus } from "@/lib/customer/api";
import { formatDate } from "@/lib/customer/date";
import { progressPct, SHELF_LABEL, SHELVES } from "@/lib/customer/libraryDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { paletteFor } from "./bookPalette";
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
  const { t } = useLocale();
  const [expanded, setExpanded] = useState<Partial<Record<BookStatus, boolean>>>({});

  return (
    <Card padding="none" className="flex flex-col gap-3 px-5 py-4">
      <h2 className="text-title font-semibold text-ink">{t("Shelves")}</h2>
      <div className="grid gap-5 md:grid-cols-3">
        {SHELVES.map((status) => {
          const books = shelves[status];
          const open = expanded[status] ?? false;
          const shown = open ? books : books.slice(0, SHOWN);
          return (
            <div key={status} className="flex min-w-0 flex-col gap-2">
              <div className="flex items-center justify-between border-b border-surface-sunken pb-2">
                <span className="text-body font-semibold text-ink">{t(SHELF_LABEL[status])}</span>
                <Chip tone="neutral" size="sm">
                  {books.length}
                </Chip>
              </div>
              {shown.length === 0 && <span className="py-3 text-small text-ink-muted">{t(EMPTY[status])}</span>}
              {shown.map((book) => (
                <ShelfRow key={book.id} book={book} status={status} onAction={onAction} />
              ))}
              {books.length > SHOWN && (
                <button type="button" onClick={() => setExpanded({ ...expanded, [status]: !open })} className="self-start text-small font-semibold text-emerald hover:underline">
                  {open ? t("Show fewer") : `${t("See all")} ${books.length}`}
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
  const { t } = useLocale();
  const detail =
    status === "READING" ? `${t("page")} ${book.pagesRead} ${t("of")} ${book.totalPages}` : status === "WANT_TO_READ" ? `${book.totalPages} ${t("pages")}` : book.author ? "" : `${book.totalPages} ${t("pages")}`;
  const sub = [book.author, detail].filter(Boolean).join(" · ");
  const end = status === "READING" ? `${progressPct(book)}%` : status === "FINISHED" && book.finishedAt ? formatDate(book.finishedAt, "d MMM") : "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={`${book.title}: ${t("actions")}`} className="-mx-2 flex h-11 items-center gap-3 rounded-md px-2 text-left transition-colors hover:bg-cream data-open:bg-cream">
        <Cover size="spine" title={book.title} color={book.color} />
        <span className="flex min-w-0 flex-1 flex-col gap-px">
          <span className="truncate text-body font-medium text-ink">{book.title}</span>
          {sub && <span className="truncate text-caption text-ink-muted">{sub}</span>}
        </span>
        {end && (
          <span className={cnEnd(status)} style={status === "READING" ? { color: paletteFor(book.color).from } : undefined}>
            {end}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
        {MENU[status].map((item) => (
          <DropdownMenuItem key={item.action} onSelect={() => onAction(book, item.action)} className={item.action === "remove" ? "rounded-md px-3 py-2 text-body text-expense focus:bg-expense-soft focus:text-expense" : "rounded-md px-3 py-2 text-body text-ink focus:bg-cream"}>
            <item.icon className="size-4" aria-hidden="true" />
            {t(item.label)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const cnEnd = (status: BookStatus) => `text-caption font-semibold whitespace-nowrap tabular-nums ${status === "FINISHED" ? "text-income" : ""}`;
