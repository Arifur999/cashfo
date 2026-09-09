import { cn } from "@/lib/utils";
import type { AdminRole } from "@/lib/api";

const STYLES: Record<AdminRole, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-700",
  SUPPORT_ADMIN: "bg-blue-100 text-blue-700",
  FINANCE_ADMIN: "bg-green-100 text-green-700",
  CONTENT_ADMIN: "bg-amber-100 text-amber-700",
};

export function AdminRoleBadge({ role }: { role: AdminRole }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", STYLES[role])}>
      {role.replaceAll("_", " ")}
    </span>
  );
}
