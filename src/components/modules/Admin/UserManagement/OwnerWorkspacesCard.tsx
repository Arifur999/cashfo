import { Building2, House, Users } from "lucide-react";
import T from "@/components/shared/T";
import { formatAmount } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { getTranslator } from "@/lib/i18n/locale";
import { plural } from "@/lib/i18n/message";
import { cn } from "@/lib/utils";
import type { IOwnerWorkspace } from "@/types/owner.types";
import { workspaceLabel } from "./peopleDisplay";

const KIND = {
  PERSONAL: { label: "Personal", icon: House, tile: "bg-mint-50 text-brand-ink" },
  BUSINESS: { label: "Business", icon: Building2, tile: "bg-warning-soft text-warning" },
  GROUP: { label: "Group", icon: Users, tile: "bg-info-soft text-info" },
} as const;

// Every workspace the person owns, as the AdminUserDetail board lists them:
// its kind, whether the plan includes it, since when, and how many
// transactions it holds. A workspace outside the plan says so in amber
// (there is no extra-workspace price yet, so no fee is shown).
const OwnerWorkspacesCard = async ({ workspaces, planName }: { workspaces: IOwnerWorkspace[]; planName: string | null }) => {
  const { t, locale } = await getTranslator("admin");
  return (
    <section aria-labelledby="owner-workspaces" className="overflow-clip rounded-card border border-line-card bg-surface shadow-card">
      <div className="px-4.5 py-3.5">
        <h2 id="owner-workspaces" className="text-title text-ink">
          <T>Workspaces</T>
        </h2>
      </div>
      {workspaces.length === 0 ? (
        <p className="border-t border-divider px-4.5 py-4 text-small text-ink-muted">
          <T>No workspace yet</T>
        </p>
      ) : (
        <ul>
          {workspaces.map((workspace) => {
            const kind = KIND[workspace.type] ?? KIND.BUSINESS;
            const since = t("since {date}", { date: formatDate(workspace.createdAt, "d MMM yyyy", "—", locale) });
            const plan = workspace.includedInPlan ? (planName ? t("on {plan}", { plan: planName }) : null) : t("extra workspace");
            return (
              <li key={workspace.id} className="flex items-center gap-3 border-t border-divider px-4.5 py-3">
                <span aria-hidden="true" className={cn("flex size-9 shrink-0 items-center justify-center rounded-field", kind.tile)}>
                  <kind.icon className="size-4.5" strokeWidth={2} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-body font-semibold text-ink">{workspaceLabel(workspace.name, t, "Personal workspace", workspace.type)}</span>
                  <span className="truncate text-[12.5px] leading-[normal] text-ink-muted">{[t(kind.label), plan, since].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="flex shrink-0 flex-col gap-0.5 text-right">
                  <span className="text-[13.5px] leading-[normal] font-semibold text-ink tabular-nums">
                    {plural(t, workspace.transactionCount, "{count} transaction", "{count} transactions", undefined, locale)}
                  </span>
                  <span className={cn("text-caption", workspace.includedInPlan ? "text-ink-muted" : "text-warning")}>
                    {workspace.includedInPlan
                      ? t("Included in the plan")
                      : workspace.monthlyFee
                        ? t("+ {amount} a month", { amount: formatAmount(workspace.monthlyFee, undefined, locale) })
                        : t("Outside the plan")}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default OwnerWorkspacesCard;
