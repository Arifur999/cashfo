"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import Card from "@/components/smartly/Card";
import { formatNumber, formatPercent } from "@/lib/number";
import type { IDeviceBreakdownEntry } from "@/types/analytics.types";
import { DEVICE_META } from "./analyticsLabels";

// Which devices people sign in on: a ring with the phone share in the
// middle, and each device's share beside it.
const DevicesCard = ({ data }: { data: IDeviceBreakdownEntry[] }) => {
  const total = data.reduce((sum, entry) => sum + entry.count, 0);
  const phone = data.find((entry) => entry.deviceType === "MOBILE");

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-title text-ink">Devices</h2>
        <span className="text-small text-ink-muted">{total > 0 ? `All ${formatNumber(total)} sign-ins so far` : "No sign-ins yet"}</span>
      </div>
      {total > 0 && (
        <div className="flex items-center gap-4">
          <div role="img" aria-label="Sign-ins by device" className="relative size-35 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="count" nameKey="deviceType" innerRadius="68%" outerRadius="100%" paddingAngle={2} strokeWidth={0} isAnimationActive={false}>
                  {data.map((entry) => (
                    <Cell key={entry.deviceType} fill={DEVICE_META[entry.deviceType].color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <b className="text-h2 font-bold text-ink tabular-nums">{Math.round(phone?.percentage ?? 0)}%</b>
              <span className="text-caption text-ink-muted">on a phone</span>
            </span>
          </div>
          <ul className="flex flex-col gap-3">
            {data.map((entry) => (
              <li key={entry.deviceType} className="flex items-center gap-2 text-small">
                <span aria-hidden="true" className="size-2.5 shrink-0 rounded-xs" style={{ background: DEVICE_META[entry.deviceType].color }} />
                <span className="text-ink-2">{DEVICE_META[entry.deviceType].label}</span>
                <b className="font-semibold text-ink tabular-nums">{formatPercent(entry.percentage)}</b>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
};

export default DevicesCard;
