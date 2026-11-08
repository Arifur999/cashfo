import { EarningsClient } from "@/components/modules/Customer/Referrals/EarningsClient";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { periodRange, readPickedPeriod, type PickedPeriod } from "@/lib/customer/period";
import { referralInfoForPage, referralPageContext } from "@/lib/customer/referralPage";
import { getEarnings } from "@/lib/customer/referrals";
import type { CommissionStatus } from "@/lib/customer/referralTypes";
import { readPageParam } from "@/lib/table/pageParams";

export const generateMetadata = () => customerPageMetadata("/referrals/earnings");

const STATUSES: CommissionStatus[] = ["ON_HOLD", "AVAILABLE", "IN_WITHDRAWAL", "UNDER_CHECK", "PAID_OUT", "REVERSED", "CANCELLED"];

// An older link's ?month=2026-10.
const OLD_MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

// Referrals > Earnings: ?status=, the Choose period picker's ?month=&year=,
// ?period=year&year= or ?from=&to= (all time without), ?page=.
export default async function EarningsPage({ searchParams }: PageProps<"/referrals/earnings">) {
  const params = await searchParams;
  const status = STATUSES.find((s) => s === params.status) ?? null;
  const { currency, today } = await referralPageContext();
  const old = typeof params.month === "string" && params.year === undefined ? OLD_MONTH.exec(params.month) : null;
  const period: PickedPeriod = old ? { kind: "month", year: Number(old[1]), month: Number(old[2]) } : readPickedPeriod(params, { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) });
  const [info, list] = await Promise.all([referralInfoForPage(), getEarnings(readPageParam(params), status ?? undefined, periodRange(period), undefined)]);
  return <EarningsClient info={info} list={list} status={status} period={period} currency={currency} today={today} />;
}
