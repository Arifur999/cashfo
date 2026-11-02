import { EarningsClient } from "@/components/modules/Customer/Referrals/EarningsClient";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { referralInfoForPage, referralPageContext } from "@/lib/customer/referralPage";
import { getEarnings } from "@/lib/customer/referrals";
import type { CommissionStatus } from "@/lib/customer/referralTypes";
import { readPageParam } from "@/lib/table/pageParams";

export const generateMetadata = () => customerPageMetadata("/referrals/earnings");

const STATUSES: CommissionStatus[] = ["ON_HOLD", "AVAILABLE", "IN_WITHDRAWAL", "UNDER_CHECK", "PAID_OUT", "REVERSED", "CANCELLED"];

// Referrals > Earnings: ?status=, ?month=2026-10, ?page=.
export default async function EarningsPage({ searchParams }: PageProps<"/referrals/earnings">) {
  const params = await searchParams;
  const status = STATUSES.find((s) => s === params.status) ?? null;
  const month = typeof params.month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month) ? params.month : null;
  const { currency, today } = await referralPageContext();
  const [info, list] = await Promise.all([referralInfoForPage(), getEarnings(readPageParam(params), status ?? undefined, month ?? undefined, undefined)]);
  return <EarningsClient info={info} list={list} status={status} month={month} currency={currency} today={today} />;
}
