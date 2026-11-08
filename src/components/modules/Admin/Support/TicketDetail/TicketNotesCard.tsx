"use client";

import RelativeTime from "@/components/shared/RelativeTime";
import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { ITicketMessage } from "@/types/ticket.types";

interface TicketNotesCardProps {
  // The ticket's notes for admins, oldest first.
  notes: (ITicketMessage & { isPending?: boolean })[];
  // An admin's name by id (the roster), for who wrote each note.
  authorName: (note: ITicketMessage) => string;
}

// The board's amber "Note for admins" card beside the thread: what the team
// wrote for each other on this ticket, which the customer never sees, or
// where to write the first one.
const TicketNotesCard = ({ notes, authorName }: TicketNotesCardProps) => {
  const { translate } = useLocale();

  return (
    <section aria-labelledby="ticket-notes" className="flex flex-col gap-2 rounded-card border border-warning-line bg-warning-50 px-4 py-3.5 shadow-card">
      <h2 id="ticket-notes" className="text-body font-semibold text-ink">
        <T>{notes.length === 1 ? "Note for admins" : "Notes for admins"}</T>
      </h2>
      {notes.length === 0 ? (
        <p className="text-small leading-normal text-warning">
          <T>{'No notes yet. Use "Note for admins" above; users never see notes.'}</T>
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {notes.map((note) => (
            <li key={note.id} className="flex flex-col gap-1">
              <p className="text-small leading-normal wrap-break-word whitespace-pre-line text-warning-ink">{note.message}</p>
              <span className="text-[11.5px] leading-[normal] text-warning">
                {authorName(note)} · {note.isPending ? translate("Saving...") : <RelativeTime value={note.createdAt} />}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};

export default TicketNotesCard;
