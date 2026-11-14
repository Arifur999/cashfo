"use client";

import type { GroupMember } from "@/lib/customer/api";
import type { Transfer } from "@/lib/customer/groupDisplay";
import { FamilyMonthOverview } from "./FamilyMonthOverview";
import type { GroupPageData, GroupView } from "./groupTypes";

interface FamilyDashboardProps {
  data: GroupPageData;
  view: GroupView;
  canAdd: boolean;
  canPay: (fromId: string) => boolean;
  onAddExpense: () => void;
  onAddContribution: () => void;
  onRecordPayment: (preset: Transfer | null) => void;
  onStatement: (member: GroupMember) => void;
}

// A group's dashboard (the v16 FamilyDashboard board, for every kind of
// group): the month on show with its quick actions, tiles, members'
// balances, where the money went and the newest entries. The month is
// picked in the header.
export function FamilyDashboard({ data, view, canAdd, canPay, onAddExpense, onAddContribution, onRecordPayment, onStatement }: FamilyDashboardProps) {
  // The signed-in customer is the group's owner when they own its workspace.
  const me = data.access.selfMemberId ? data.members.find((member) => member.id === data.access.selfMemberId) : undefined;
  return <FamilyMonthOverview data={data} view={view} me={me} canAdd={canAdd} canPay={canPay} onAddExpense={onAddExpense} onAddContribution={onAddContribution} onRecordPayment={onRecordPayment} onStatement={onStatement} />;
}
