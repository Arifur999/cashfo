"use client";

import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteSavedReplyAction } from "@/app/(dashboardLayout)/admin/support/_action";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import FormDrawer from "@/components/shared/dialog/FormDrawer";
import Button from "@/components/smartly/Button";
import ErrorState from "@/components/smartly/ErrorState";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { queryKeys } from "@/lib/queryKeys";
import { savedRepliesQuery } from "@/queries/ticket.queries";
import type { ISavedReply } from "@/types/ticket.types";
import SavedReplyForm from "./SavedReplyForm";

interface SavedRepliesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Support and super admins keep the list; everyone else reads it.
  canManage: boolean;
}

type Editing = { reply?: ISavedReply } | null;

// The support team's saved replies, from the page header or the reply
// box: each one's name and text, and (for those who keep them) adding,
// changing and deleting one. The form takes the drawer's place while open.
const SavedRepliesDrawer = ({ open, onOpenChange, canManage }: SavedRepliesDrawerProps) => {
  const { translate } = useLocale();
  const query = useQuery({ ...savedRepliesQuery(), enabled: open });
  const replies = query.data?.data;
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<ISavedReply | null>(null);
  const remove = useActionMutation({
    action: (reply: ISavedReply) => deleteSavedReplyAction(reply.id),
    successMessage: "Saved reply deleted",
    invalidateKeys: [queryKeys.savedReplies.all],
    refreshRoute: false,
  });

  const title = editing ? (editing.reply ? "Edit saved reply" : "New saved reply") : "Saved replies";

  return (
    <>
      <FormDrawer
        open={open}
        onOpenChange={(next) => {
          if (!next) setEditing(null);
          onOpenChange(next);
        }}
        title={title}
        description={editing ? undefined : "Answers the whole team can drop into a reply."}
        width="md"
      >
        {editing ? (
          <SavedReplyForm key={editing.reply?.id ?? "new"} reply={editing.reply} onDone={() => setEditing(null)} />
        ) : (
          <div className="flex flex-col gap-3">
            {canManage && (
              <Button variant="secondary" size="sm" className="self-start" onClick={() => setEditing({})}>
                <Plus aria-hidden="true" />
                {translate("New saved reply")}
              </Button>
            )}
            {query.isError && !replies ? (
              <ErrorState title={translate("Couldn't load saved replies")} description={translate("Try again in a moment.")} onRetry={() => void query.refetch()} />
            ) : replies?.length === 0 ? (
              <p className="py-6 text-center text-small text-ink-muted">{translate("No saved replies yet.")}</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {replies?.map((reply) => (
                  <li key={reply.id} className="flex flex-col gap-1.5 rounded-md border border-line bg-surface px-4 py-3">
                    <div className="flex items-start gap-2">
                      <b className="min-w-0 grow text-body font-semibold wrap-break-word text-ink">{reply.title}</b>
                      {canManage && (
                        <span className="-my-1 -mr-2 flex shrink-0 gap-0.5">
                          <Button variant="ghost" size="icon-xs" aria-label={translate("Edit {name}", { name: reply.title })} onClick={() => setEditing({ reply })}>
                            <Pencil className="size-3.75" aria-hidden="true" />
                          </Button>
                          <Button variant="ghost" size="icon-xs" className="hover:text-expense" aria-label={translate("Delete {name}", { name: reply.title })} onClick={() => setDeleting(reply)}>
                            <Trash2 className="size-3.75" aria-hidden="true" />
                          </Button>
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-3 text-small wrap-break-word whitespace-pre-line text-ink-2">{reply.bodyEn}</p>
                    <span className={reply.bodyBn ? "text-caption text-emerald" : "text-caption text-warning"}>{translate(reply.bodyBn ? "বাংলা written" : "বাংলা not written yet")}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </FormDrawer>
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(next) => !next && setDeleting(null)}
        title="Delete this saved reply?"
        description={<>{translate("\"{name}\" goes for the whole team. Replies already sent keep their text.", { name: deleting?.title ?? "" })}</>}
        confirmLabel="Delete"
        variant="destructive"
        isPending={remove.isPending}
        onConfirm={async () => {
          if (deleting && (await remove.run(deleting))) setDeleting(null);
        }}
      />
    </>
  );
};

export default SavedRepliesDrawer;
