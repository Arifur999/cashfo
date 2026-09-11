"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/AuthProvider";
import { deleteBusinessAction } from "@/lib/businessActions";
import { EditWorkspaceModal } from "./EditWorkspaceModal";
import type { UserBusiness } from "@/lib/api";

export function WorkspaceSettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState<UserBusiness | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(business: UserBusiness) {
    if (!window.confirm(`Delete "${business.name}"? This cannot be undone.`)) {
      return;
    }
    startTransition(async () => {
      const result = await deleteBusinessAction(business.id);
      if (result.success) {
        toast.success("Workspace deleted");
        router.refresh();
      } else {
        toast.error(result.message ?? "Failed to delete workspace");
      }
    });
  }

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <h1 className="text-xl font-semibold text-neutral-900">Workspaces</h1>
      <p className="mt-1 text-sm text-neutral-500">Manage your Personal and Business workspaces.</p>

      <div className="mt-6 space-y-3">
        {user.businesses.map((b) => (
          <div key={b.id} className="flex items-center justify-between rounded-2xl bg-surface p-4 shadow-sm shadow-black/5">
            <div>
              <p className="font-medium text-neutral-900">
                {b.name} {b.isDefault && <span className="ml-2 rounded-full bg-brand-primary/10 px-2 py-0.5 text-xs font-medium text-brand-primary">Default</span>}
              </p>
              <p className="text-sm text-neutral-500">
                {b.type} • {b.role}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {b.role === "OWNER" && (
                <button
                  type="button"
                  onClick={() => setEditing(b)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-neutral-500 hover:bg-neutral-100"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
              )}
              {b.isDefault ? (
                <span title="Your default Personal workspace can't be deleted -- every account must always have one." className="cursor-not-allowed px-2 py-1 text-xs font-medium text-neutral-300">
                  <Trash2 className="h-3.5 w-3.5" />
                </span>
              ) : (
                b.role === "OWNER" && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleDelete(b)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-brand-danger hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                )
              )}
            </div>
          </div>
        ))}
      </div>

      <EditWorkspaceModal business={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
