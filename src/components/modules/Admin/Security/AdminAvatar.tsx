import { ADMIN_ROLE_AVATAR } from "@/lib/adminRoles";
import { getInitials } from "@/lib/text";
import { cn } from "@/lib/utils";
import type { AdminRole } from "@/types/auth.types";

interface AdminAvatarProps {
  name: string;
  role: AdminRole;
  // 34px in the admin team, 26px beside a name in the audit log.
  size?: "sm" | "md";
  // A suspended admin's initials go grey.
  muted?: boolean;
}

// An admin's initials in their role's colours.
const AdminAvatar = ({ name, role, size = "md", muted = false }: AdminAvatarProps) => (
  <span
    aria-hidden="true"
    className={cn(
      "flex shrink-0 items-center justify-center rounded-full text-caption font-bold",
      size === "md" ? "size-8.5" : "size-6.5",
      muted ? "bg-surface-sunken text-ink-muted" : ADMIN_ROLE_AVATAR[role],
    )}
  >
    {getInitials(name) || "?"}
  </span>
);

export default AdminAvatar;
