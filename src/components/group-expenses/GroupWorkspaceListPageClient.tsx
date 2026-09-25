"use client";

import { Plus, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteBusinessAction } from "@/lib/businessActions";
import type { WorkspaceListItem } from "@/lib/api";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { CreateGroupWorkspaceModal } from "./CreateGroupWorkspaceModal";

interface GroupWorkspaceListPageClientProps {
  workspaces: WorkspaceListItem[];
}

export function GroupWorkspaceListPageClient({ workspaces }: GroupWorkspaceListPageClientProps) {
  const router = useRouter();
  const { t } = useLocale();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WorkspaceListItem | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    startTransition(async () => {
      const result = await deleteBusinessAction(target.id);
      if (result.success) {
        toast.success(t("Group workspace deleted"));
        setDeleteTarget(null);
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to delete group workspace"));
      }
    });
  }

  return (
    <div className="h-full bg-brand-content px-6 py-8 pb-24 md:pb-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{t("Group Expense")}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t("Mess or joint-family shared expenses, split equally at month end.")}</p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover"
        >
          <Plus className="h-4 w-4" /> {t("New Group / Mess")}
        </button>
      </div>

      {workspaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-surface px-4 py-16 text-center shadow-sm shadow-black/5">
          <Users className="h-10 w-10 text-neutral-300" />
          <p className="mt-3 text-sm text-neutral-500">{t("No group/mess workspaces yet.")}</p>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="mt-4 flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover"
          >
            <Plus className="h-4 w-4" /> {t("New Group / Mess")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/group-expenses/${ws.id}`)}
              onKeyDown={(e) => e.key === "Enter" && router.push(`/group-expenses/${ws.id}`)}
              className="flex cursor-pointer flex-col rounded-2xl bg-surface p-5 text-left shadow-sm shadow-black/5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                  <Users className="h-5 w-5" />
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(ws);
                  }}
                  title={t("Delete")}
                  className="rounded-lg p-1.5 text-neutral-300 hover:bg-neutral-100 hover:text-brand-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-3 truncate text-sm font-semibold text-neutral-900">{ws.name}</p>
              <p className="text-xs text-neutral-400">{t("Group / Mess Workspace")}</p>
            </div>
          ))}
        </div>
      )}

      <CreateGroupWorkspaceModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(ws) => router.push(`/group-expenses/${ws.id}`)} />

      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isPending={isPending}
        title={t("Delete Group Workspace")}
        message={deleteTarget ? `${t("Delete")} "${deleteTarget.name}"? ${t("This cannot be undone.")}` : ""}
        confirmLabel={t("Delete")}
      />
    </div>
  );
}
