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

// Area, then a 130px column per role, as the board draws it. The matrix
// scrolls sideways where it can't fit, so the grid isn't md-only (the heads
// show on phones too), and its rows hold their width.
const COLUMNS = "grid-cols-[minmax(11rem,1fr)_repeat(4,8.125rem)] min-w-180 gap-x-0";
// On a phone the Area column stays put while the marks scroll under it, with
// a divider beside it; from md up the whole grid fits, so it is plain. The
// row's left inset moves into these cells, so a stuck cell keeps its padding.
const STICKY = "sticky left-0 z-1 flex self-stretch border-r border-divider pr-3 pl-4 md:static md:border-r-0 md:pl-4.5";
const KEY: RoleAccess[] = ["do", "look", "none"];

// A tick on mint (can do it), an eye on grey (can only look), or an empty
// dashed square (can't see it).
const AccessMark = ({ access, size = "md" }: { access: RoleAccess; size?: "sm" | "md" }) => (
  <span
    aria-hidden="true"
    className={cn(
      "flex shrink-0 items-center justify-center",
      size === "md" ? "size-6.5 rounded-[7px]" : "size-5 rounded-[6px]",
      access === "do" && "bg-mint-50 text-emerald",
      access === "look" && "bg-surface-sunken text-ink-2",
      access === "none" && "border border-dashed border-input",
    )}
  >
    {access === "do" && <Check className={size === "md" ? "size-3.5" : "size-3"} strokeWidth={size === "md" ? 2.5 : 3} />}
    {access === "look" && <Eye className={size === "md" ? "size-3.5" : "size-3"} strokeWidth={2.25} />}
  </span>
);

// Security > Roles: what each admin role may do, area by area, as the panel
// and the API enforce it today. Built on the list recipes; the table is a
// scroll box that takes focus, so the keyboard can scroll it too.
const RolesMatrix = () => {
  const { translate } = useLocale();
  return (
    <ListCard
      label={translate("Permissions by role")}
      header={
        <div className="flex flex-col gap-3 px-4 py-3.5 md:flex-row md:items-center md:justify-between md:px-4.5">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="text-title text-ink">
              <T>What each role can do</T>
            </h2>
            <p className="text-[12.5px] text-ink-muted">
              <T>This is what the server allows today. Changing it needs a code change for now.</T>
            </p>
          </div>
          <ul aria-label={translate("Key@@legend")} className="flex flex-wrap gap-3.5 text-[12.5px] whitespace-nowrap text-ink-2">
            {KEY.map((access) => (
              <li key={access} className="flex items-center gap-1.25">
                <AccessMark access={access} size="sm" />
                {upperFirst(translate(ROLE_ACCESS_LABEL[access]))}
              </li>
            ))}
          </ul>
        </div>
      }
      tableClassName="overflow-x-auto"
      scrollable
    >
      <ListHead columns={COLUMNS} showOnPhone className="h-9 border-t pl-0 text-[12.5px] font-semibold text-ink-2 md:pr-4.5 md:pl-0">
        <ListHeadCell className={cn(STICKY, "items-center border-line bg-table-head")}>
          <T>Area</T>
        </ListHeadCell>
        {ADMIN_ROLES.map((role) => (
          <ListHeadCell key={role} align="center">
            <span className={cn("rounded-full px-2.25 py-0.5 font-semibold", ADMIN_ROLE_CHIP[role])}>
              <T>{ADMIN_ROLE_SHORT_LABELS[role]}</T>
            </span>
          </ListHeadCell>
        ))}
      </ListHead>
      {ROLE_PERMISSIONS.map((row) => (
        <ListRow key={row.area} columns={COLUMNS} className="min-h-11.5 py-0 pl-0 text-[13.5px] md:py-0 md:pr-4.5 md:pl-0">
          <ListCell role="rowheader" className={cn(STICKY, "flex-col justify-center bg-surface py-1")}>
            <span className="font-medium text-ink">
              <T>{row.area}</T>
            </span>
            {row.note && (
              <span className="text-caption text-ink-faint">
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
