"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import T from "@/components/shared/T";
import Card from "@/components/smartly/Card";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatPercent } from "@/lib/number";
import type { IDeviceBreakdownEntry } from "@/types/analytics.types";
import { DEVICE_META } from "./analyticsLabels";
import { ListPlaceholder, ReportError, type ReportQuery } from "./ReportState";

// Which devices people sign in on: a ring with the phone share in the
// middle, and each device's share beside it, both to one decimal.
// The period's sign-ins ("3,870 sign-ins this month"), as the board heads it.
const DevicesCard = ({ data, query, inPeriod }: { data: IDeviceBreakdownEntry[] | undefined; query: ReportQuery; inPeriod: string }) => {
  const rows = data ?? [];
  const total = rows.reduce((sum, entry) => sum + entry.count, 0);
  const phone = rows.find((entry) => entry.deviceType === "MOBILE");
  const { translate, locale } = useLocale();
  const percent = (value: number) => toLocaleDigits(formatPercent(value), locale);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-title text-ink">
          <T>Devices</T>
        </h2>
        {query.status === "ready" && (
          <span className="text-small text-ink-muted">{total > 0 ? translate("{count} sign-ins {period}", { count: formatCount(total, locale), period: inPeriod }) : translate("No sign-ins {period}", { period: inPeriod })}</span>
        )}
      </div>
      {query.status === "pending" && <ListPlaceholder />}
      {query.status === "error" && <ReportError onRetry={query.retry} />}
      {query.status === "ready" && total > 0 && (
        <div className="flex items-center gap-4.5">
          <div role="img" aria-label={translate("Sign-ins by device")} className="relative size-35 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={rows} dataKey="count" nameKey="deviceType" innerRadius="64%" outerRadius="90%" paddingAngle={0} strokeWidth={0} isAnimationActive={false}>
                  {rows.map((entry) => (
                    <Cell key={entry.deviceType} fill={DEVICE_META[entry.deviceType].color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <b className="text-[20px] leading-[normal] font-bold text-ink tabular-nums">{toLocaleDigits(`${Math.round(phone?.percentage ?? 0)}%`, locale)}</b>
              <span className="text-[11.5px] leading-[normal] text-ink-muted">
                <T>on a phone</T>
              </span>
            </span>
          </div>
          <ul className="flex grow flex-col gap-2.5">
            {rows.map((entry) => (
              <li key={entry.deviceType} className="flex items-center gap-2 text-[13px] leading-[normal]">
                <span aria-hidden="true" className="size-2.5 shrink-0 rounded-xs" style={{ background: DEVICE_META[entry.deviceType].color }} />
                <span className="grow text-ink">
                  <T>{DEVICE_META[entry.deviceType].label}</T>
                </span>
                <b className="font-semibold text-ink tabular-nums">{percent(entry.percentage)}</b>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
};

export default DevicesCard;
