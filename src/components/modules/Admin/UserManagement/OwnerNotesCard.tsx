"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { addOwnerNoteAction, deleteOwnerNoteAction } from "@/app/(dashboardLayout)/admin/users/_action";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import Button from "@/components/smartly/Button";
import Textarea from "@/components/smartly/form/Textarea";
import { useActionMutation } from "@/hooks/useActionMutation";
import { formatDate } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { queryKeys } from "@/lib/queryKeys";
import { ownerNotesQuery } from "@/queries/owner.queries";
import type { IOwnerNote } from "@/types/owner.types";

interface OwnerNotesCardProps {
  userId: string;
  // MANAGE_ROLES ownerNotes: support and super admins write; every admin reads.
  canWrite: boolean;
  // How many the card shows; the Notes tab shows them all.
  limit?: number;
}

const NOTE_MAX = 2000;

// "Notes for admins" (AdminUserDetail): what the team should know about
// this person, on pale amber, each with who wrote it and when. The user
// never sees them. The author, or a super admin, may remove one.
export function OwnerNotesCard({ userId, canWrite, limit }: OwnerNotesCardProps) {
  const { translate, locale } = useLocale();
  const fieldId = useId();
  const notes = useQuery(ownerNotesQuery(userId));
  const [writing, setWriting] = useState(false);
  const [body, setBody] = useState("");
  const [removing, setRemoving] = useState<IOwnerNote | null>(null);
  const invalidateKeys = [queryKeys.owners.detail(userId)];
  const add = useActionMutation({ action: (text: string) => addOwnerNoteAction(userId, { body: text }), successMessage: "Note saved", invalidateKeys, refreshRoute: true });
  const remove = useActionMutation({ action: (noteId: string) => deleteOwnerNoteAction(userId, noteId), successMessage: "Note removed", invalidateKeys, refreshRoute: true });

  const list = notes.data?.data ?? [];
  const shown = limit === undefined ? list : list.slice(0, limit);
  const trimmed = body.trim();

  async function save() {
    if (!trimmed || trimmed.length > NOTE_MAX) return;
    if (await add.run(trimmed)) {
      setBody("");
      setWriting(false);
    }
  }

  return (
    <section aria-labelledby="owner-notes" className="flex flex-col gap-2.5 rounded-card border border-line-card bg-surface px-4.5 py-4 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="owner-notes" className="text-title text-ink">
          {translate("Notes for admins")}
        </h2>
        <span className="text-caption text-ink-muted">{translate("The user never sees these")}</span>
      </div>

      {notes.isError ? (
        <p className="text-small text-ink-muted">{translate("Couldn't load the notes.")}</p>
      ) : notes.isPending ? (
        <p className="text-small text-ink-muted">{translate("Loading...")}</p>
      ) : shown.length === 0 && !writing ? (
        <p className="text-small text-ink-muted">{translate("No notes yet.")}</p>
      ) : (
        shown.map((note) => (
          <div key={note.id} className="group relative rounded-field border border-warning-soft bg-warning-50 px-3 py-2.5 text-small leading-[1.5] text-ink">
            <p className="whitespace-pre-line wrap-anywhere">{note.body}</p>
            <span className="mt-1 flex items-center justify-between gap-2 text-[11.5px] leading-[normal] text-warning">
              <span>
                {note.author.name} · {formatDate(note.createdAt, "d MMM", "—", locale)}
              </span>
              {note.canDelete && (
                <button
                  type="button"
                  onClick={() => setRemoving(note)}
                  aria-label={translate("Remove this note")}
                  className="flex size-6 items-center justify-center rounded-full text-warning transition-colors hover:bg-warning-soft pointer-coarse:size-9"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </span>
          </div>
        ))
      )}

      {canWrite &&
        (writing ? (
          <div className="flex flex-col gap-2">
            <label htmlFor={fieldId} className="sr-only">
              {translate("New note")}
            </label>
            <Textarea
              id={fieldId}
              rows={3}
              autoFocus
              value={body}
              maxLength={NOTE_MAX}
              onChange={(event) => setBody(event.target.value)}
              placeholder={translate("What should the other admins know?")}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={add.isPending}
                onClick={() => {
                  setWriting(false);
                  setBody("");
                }}
              >
                {translate("Cancel")}
              </Button>
              <Button type="button" variant="action" size="sm" disabled={add.isPending || !trimmed} onClick={save}>
                {translate(add.isPending ? "Saving..." : "Save note")}
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" variant="secondary" size="sm" className="h-8.5 w-full pointer-coarse:h-11" onClick={() => setWriting(true)}>
            <Plus className="size-3.5 text-ink-2" strokeWidth={2.5} aria-hidden="true" />
            {translate("Add a note")}
          </Button>
        ))}

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        variant="destructive"
        title={translate("Remove this note?")}
        description={translate("The other admins won't see it any more. The audit log keeps what it said.")}
        confirmLabel="Remove"
        pendingLabel="Removing..."
        isPending={remove.isPending}
        onConfirm={async () => {
          if (removing && (await remove.run(removing.id))) setRemoving(null);
        }}
      />
    </section>
  );
}
