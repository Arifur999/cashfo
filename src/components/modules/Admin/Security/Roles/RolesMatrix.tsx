import { Check, Eye } from "lucide-react";
import Card from "@/components/smartly/Card";
import { ADMIN_ROLE_CHIP, ADMIN_ROLE_SHORT_LABELS } from "@/lib/adminRoles";
import { ROLE_ACCESS_LABEL, ROLE_PERMISSIONS, type RoleAccess } from "@/lib/rolePermissions";
import { upperFirst } from "@/lib/text";
import { cn } from "@/lib/utils";
import { ADMIN_ROLES } from "@/types/adminAccount.types";

const GRID = "grid min-w-180 grid-cols-[minmax(0,1fr)_repeat(4,130px)] items-center px-5";
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
// and the API enforce it today.
const RolesMatrix = () => {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div className="flex flex-col gap-0.5">
          <h2 id="roles-title" className="text-title text-ink">
            What each role can do
          </h2>
          <p className="text-small text-ink-muted">This is what the server allows today. Changing it needs a code change for now.</p>
        </div>
        <ul aria-label="Key" className="flex flex-wrap gap-4 text-small whitespace-nowrap text-ink-2">
          {KEY.map((access) => (
            <li key={access} className="flex items-center gap-1">
              <AccessMark access={access} size="sm" />
              {upperFirst(ROLE_ACCESS_LABEL[access])}
            </li>
          ))}
        </ul>
      </div>
      <div role="table" aria-labelledby="roles-title" className="overflow-x-auto">
        <div role="row" className={cn(GRID, "border-y border-line bg-cream py-3 text-small font-semibold text-ink-2")}>
          <span role="columnheader">Area</span>
          {ADMIN_ROLES.map((role) => (
            <span role="columnheader" key={role} className="text-center">
              <span className={cn("rounded-full px-2 py-0.5", ADMIN_ROLE_CHIP[role])}>{ADMIN_ROLE_SHORT_LABELS[role]}</span>
            </span>
          ))}
        </div>
        {ROLE_PERMISSIONS.map((row) => (
          <div role="row" key={row.area} className={cn(GRID, "min-h-11.5 border-b border-surface-sunken py-1 text-body last:border-b-0")}>
            <span role="rowheader" className="flex flex-col">
              <span className="font-medium text-ink">{row.area}</span>
              {row.note && <span className="text-caption text-ink-muted">{row.note}</span>}
            </span>
            {ADMIN_ROLES.map((role) => (
              <span role="cell" key={role} className="flex justify-center" title={`${ADMIN_ROLE_SHORT_LABELS[role]}: ${ROLE_ACCESS_LABEL[row.access[role]]}`}>
                <AccessMark access={row.access[role]} />
                <span className="sr-only">{ROLE_ACCESS_LABEL[row.access[role]]}</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
};

export default RolesMatrix;
