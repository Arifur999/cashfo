"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/AuthProvider";
import { deleteBusinessAction, listBusinessesAction } from "@/lib/businessActions";
import { formatCurrency } from "@/lib/currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { EditWorkspaceModal } from "./EditWorkspaceModal";
import type { WorkspaceListItem } from "@/lib/api";

export function WorkspaceSettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useLocale();
  const [businesses, setBusinesses] = useState<WorkspaceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<WorkspaceListItem | null>(null);
  const [isPending, startTransition] = useTransition();

  // The default (PERSONAL) workspace's own `name` is literally "Personal" in
  // the database (set at registration, never user-edited) -- show the
  // account holder's own name for it instead, everywhere this list would
  // otherwise render business.name, without touching Business.name itself.
  const displayName = (b: WorkspaceListItem) => (b.isDefault ? user.name : b.name);

  // This page needs the richer list shape (phone/email/monthlyFee) that
  // useAuth()'s user.businesses (from /api/auth/me) doesn't carry, so it
  // fetches its own copy via GET /api/businesses rather than reading
  // useAuth() -- re-fetched after any create/edit/delete since router.
  // refresh() alone only re-runs the server layout, not this client fetch.
  const loadBusinesses = useCallback(() => {
    listBusinessesAction().then((result) => {
      if (result.success && result.data) setBusinesses(result.data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    loadBusinesses();
  }, [loadBusinesses]);

  function handleDelete(business: WorkspaceListItem) {
    if (!window.confirm(`${t("Delete")} "${displayName(business)}"? ${t("This cannot be undone.")}`)) {
      return;
    }
    startTransition(async () => {
      const result = await deleteBusinessAction(business.id);
      if (result.success) {
        toast.success(t("Workspace deleted"));
        loadBusinesses();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to delete workspace"));
      }
    });
  }

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <h1 className="text-xl font-semibold text-neutral-900">{t("Workspaces")}</h1>
      <p className="mt-1 text-sm text-neutral-500">{t("Manage your Personal and Business workspaces.")}</p>

      <div className="mt-6 space-y-3">
        {!loading &&
          businesses.map((b) => {
            const trialActive = b.trialEndsAt ? new Date(b.trialEndsAt) > new Date() : null;
            const contactLine = [b.phone, b.email].filter(Boolean).join(" • ");
            return (
              <div key={b.id} className="flex items-center justify-between rounded-2xl bg-surface p-4 shadow-sm shadow-black/5">
                <div>
                  <p className="flex flex-wrap items-center gap-2 font-medium text-neutral-900">
                    {displayName(b)}
                    {b.isDefault && (
                      <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-xs font-medium text-brand-primary">{t("Default")}</span>
                    )}
                    {b.trialEndsAt && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                          trialActive ? "bg-amber-100 text-amber-700" : "bg-brand-danger/10 text-brand-danger"
                        }`}
                      >
                        {trialActive ? t("Trial") : t("Trial expired")}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {b.type} • {b.role}
                  </p>
                  {contactLine && <p className="text-sm text-neutral-500">{contactLine}</p>}
                  {b.monthlyFee !== null && (
                    <p className="text-sm text-neutral-500">
                      {t("Monthly fee:")} {formatCurrency(b.monthlyFee, b.currency)} {t("(50% of your plan)")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {b.role === "OWNER" && (
                    <button
                      type="button"
                      onClick={() => setEditing(b)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-neutral-500 hover:bg-neutral-100"
                    >
                      <Pencil className="h-3.5 w-3.5" /> {t("Edit")}
                    </button>
                  )}
                  {b.isDefault ? (
                    <span
                      title={t("Your default Personal workspace can't be deleted -- every account must always have one.")}
                      className="cursor-not-allowed px-2 py-1 text-xs font-medium text-neutral-300"
                    >
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
                        <Trash2 className="h-3.5 w-3.5" /> {t("Delete")}
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
      </div>

      <EditWorkspaceModal
        business={editing}
        onClose={() => {
          setEditing(null);
          loadBusinesses();
        }}
      />
    </div>
  );
}
