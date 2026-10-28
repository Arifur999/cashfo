"use client";

import Link from "next/link";
import ChoiceCard, { ChoiceCardGroup } from "@/components/smartly/ChoiceCard";
import T from "@/components/shared/T";
import { ADMIN_ROLE_SHORT_LABELS } from "@/lib/adminRoles";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { ADMIN_ROLES } from "@/types/adminAccount.types";
import type { AdminRole } from "@/types/auth.types";

// What each role may change, in the invite drawer's words.
export const ADMIN_ROLE_SUMMARY: Record<AdminRole, string> = {
  SUPER_ADMIN: "Everything, including security, system and settings.",
  SUPPORT_ADMIN: "Tickets, feature requests and campaigns. Can suspend users.",
  FINANCE_ADMIN: "Plans, coupons, payments, refunds and payouts. Can change a user's plan.",
  CONTENT_ADMIN: "Announcements, legal pages, translations, categories and templates.",
};

interface RoleChoicesProps {
  value: AdminRole;
  onChange: (role: AdminRole) => void;
  // The legend's id, which names the group.
  labelledBy: string;
}

// The role as four cards, then what the picked one can't change: the
// invite drawer and Change role both ask this way.
const RoleChoices = ({ value, onChange, labelledBy }: RoleChoicesProps) => {
  const { translate } = useLocale();
  const role = translate(ADMIN_ROLE_SHORT_LABELS[value]);
  return (
    <>
      <ChoiceCardGroup aria-labelledby={labelledBy}>
        {ADMIN_ROLES.map((option) => (
          <ChoiceCard
            key={option}
            checked={value === option}
            onSelect={() => onChange(option)}
            title={<T>{ADMIN_ROLE_SHORT_LABELS[option]}</T>}
            sub={<T>{ADMIN_ROLE_SUMMARY[option]}</T>}
          />
        ))}
      </ChoiceCardGroup>
      <div className="flex flex-col gap-1 rounded-md border border-divider bg-strip px-3 py-2.5 text-[12.5px] leading-normal text-ink-2">
        <b className="text-small font-semibold text-ink">
          {value === "SUPER_ADMIN" ? <T>Super admins can open and change every page.</T> : <T values={{ role }}>{"Everything else is view only for {role}."}</T>}
        </b>
        <span>
          {value !== "SUPER_ADMIN" && (
            <>
              <T>Security and System stay hidden.</T>{" "}
            </>
          )}
          <Link href="/admin/security/roles" className="font-semibold text-emerald hover:underline">
            <T>See what each role can do</T>
          </Link>
        </span>
      </div>
    </>
  );
};

export default RoleChoices;
