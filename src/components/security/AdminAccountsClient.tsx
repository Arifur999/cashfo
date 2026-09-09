"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import type { FullAdminUser } from "@/lib/api";
import { t } from "@/lib/i18n/t";
import { AdminActionsMenu } from "./AdminActionsMenu";
import { AdminRoleBadge } from "./AdminRoleBadge";
import { NewAdminModal } from "./NewAdminModal";

interface AdminAccountsClientProps {
  admins: FullAdminUser[];
  currentAdminId: string;
}

export function AdminAccountsClient({ admins, currentAdminId }: AdminAccountsClientProps) {
  const [isNewAdminOpen, setIsNewAdminOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsNewAdminOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover"
        >
          <Plus className="h-4 w-4" />
          {t("New Admin")}
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm shadow-black/5">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">{t("Name")}</th>
              <th className="px-4 py-3 font-medium">{t("Email")}</th>
              <th className="px-4 py-3 font-medium">{t("Role")}</th>
              <th className="px-4 py-3 font-medium">{t("Status")}</th>
              <th className="px-4 py-3 font-medium">{t("Last Login")}</th>
              <th className="px-4 py-3 font-medium text-right">{t("Actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {admins.map((admin) => {
              const isSelf = admin.id === currentAdminId;
              return (
                <tr key={admin.id} className="hover:bg-neutral-50/60">
                  <td className="px-4 py-3 font-medium text-neutral-900">
                    {admin.name}
                    {isSelf && <span className="ml-2 text-xs text-neutral-400">({t("You")})</span>}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{admin.email}</td>
                  <td className="px-4 py-3">
                    <AdminRoleBadge role={admin.role} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        admin.status === "ACTIVE"
                          ? "inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700"
                          : "inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700"
                      }
                    >
                      {admin.status === "ACTIVE" ? t("Active") : t("Suspended")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <AdminActionsMenu admin={admin} isSelf={isSelf} />
                  </td>
                </tr>
              );
            })}
            {admins.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-neutral-400">
                  {t("No admin accounts found.")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <NewAdminModal open={isNewAdminOpen} onClose={() => setIsNewAdminOpen(false)} />
    </div>
  );
}
