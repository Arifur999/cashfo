"use client";

import { Check, Eye } from "lucide-react";
import T from "@/components/shared/T";
import { ListCard, ListCell, ListHead, ListHeadCell, ListRow } from "@/components/smartly/list";
import { ADMIN_ROLE_CHIP, ADMIN_ROLE_SHORT_LABELS } from "@/lib/adminRoles";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { ROLE_ACCESS_LABEL, ROLE_PERMISSIONS, type RoleAccess } from "@/lib/rolePermissions";
import { upperFirst } from "@/lib/text";
import { cn } from "@/lib/utils";
import { ADMIN_ROLES } from "@/types/adminAccount.types";

// Area, then a column per role. The matrix scrolls sideways where it can't
// fit, so the grid isn't md-only (the heads show on phones too), and its
// rows hold their width.
const COLUMNS = "grid-cols-[minmax(11rem,1fr)_repeat(4,7.5rem)] min-w-180";
// The Area column stays put while the marks scroll under it. The row's left
// inset moves into these cells, so a stuck cell keeps its padding, and they
// fill the row's height, so the divider beside them runs top to bottom.
const STICKY = "sticky left-0 z-1 flex self-stretch border-r border-divider pr-3 pl-4 md:pl-6";
const KEY: RoleAccess[] = ["do", "look", "none"];

// A tick on mint (can do it), an eye on sand (can only look), or an empty
// dashed square (can't see it).
const AccessMark = ({ access, size = "md" }: { access: RoleAccess; size?: "sm" | "md" }) => (
  <span
    aria-hidden="true"
    className={cn(
      "flex shrink-0 items-center justify-center rounded-sm",
      size === "md" ? "size-6.5" : "size-5",
      access === "do" && "bg-mint-50 text-emerald",
      access === "look" && "bg-surface-sunken text-ink-2",
      access === "none" && "border border-dashed border-line-strong",
    )}
  >
    {access === "do" && <Check className="size-3.5" strokeWidth={2.5} />}
    {access === "look" && <Eye className="size-3.5" />}
  </span>
);

// Security > Roles: what each admin role may do, area by area, as the panel
// and the API enforce it today. Built on the list recipes; the table is a
// scroll box that takes focus, so the keyboard can scroll it too.
const RolesMatrix = () => {
  const { translate } = useLocale();
  return (
    <ListCard
      label={translate("What each role can do")}
      title={<T>What each role can do</T>}
      description={<T>This is what the server allows today. Changing it needs a code change for now.</T>}
      actions={
        <ul aria-label={translate("Key@@legend")} className="flex flex-wrap gap-4 text-small whitespace-nowrap text-ink-2">
          {KEY.map((access) => (
            <li key={access} className="flex items-center gap-1">
              <AccessMark access={access} size="sm" />
              {upperFirst(translate(ROLE_ACCESS_LABEL[access]))}
            </li>
          ))}
        </ul>
      }
      tableClassName="overflow-x-auto"
      scrollable
    >
      <ListHead columns={COLUMNS} showOnPhone className="pl-0 md:pl-0">
        <ListHeadCell className={cn(STICKY, "items-center border-white/12 bg-aurora-deep")}>
          <T>Area</T>
        </ListHeadCell>
        {ADMIN_ROLES.map((role) => (
          <ListHeadCell key={role} align="center">
            <span className={cn("rounded-full px-2 py-0.5 font-semibold", ADMIN_ROLE_CHIP[role])}>
              <T>{ADMIN_ROLE_SHORT_LABELS[role]}</T>
            </span>
          </ListHeadCell>
        ))}
      </ListHead>
      {ROLE_PERMISSIONS.map((row) => (
        <ListRow key={row.area} columns={COLUMNS} density="dense" className="py-0 pl-0 md:py-0 md:pl-0">
          <ListCell role="rowheader" className={cn(STICKY, "flex-col justify-center gap-px bg-surface py-2")}>
            <span className="font-medium text-ink">
              <T>{row.area}</T>
            </span>
            {row.note && (
              <span className="text-caption text-ink-muted">
                <T>{row.note}</T>
              </span>
            )}
          </ListCell>
          {ADMIN_ROLES.map((role) => (
            <ListCell key={role} className="flex justify-center" title={`${translate(ADMIN_ROLE_SHORT_LABELS[role])}: ${translate(ROLE_ACCESS_LABEL[row.access[role]])}`}>
              <AccessMark access={row.access[role]} />
              <span className="sr-only">
                <T>{ROLE_ACCESS_LABEL[row.access[role]]}</T>
              </span>
            </ListCell>
          ))}
        </ListRow>
      ))}
    </ListCard>
  );
};

export default RolesMatrix;
