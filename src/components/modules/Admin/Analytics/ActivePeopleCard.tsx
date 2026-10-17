"use client";

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card from "@/components/smartly/Card";
import { formatNumber } from "@/lib/number";
import type { IEngagementPoint } from "@/types/analytics.types";
import { formatShortDay } from "./analyticsLabels";

// People active each day (mint bars) under the people active in the seven
// days up to it (the forest line), as the design draws it.
const ActivePeopleCard = ({ data }: { data: IEngagementPoint[] }) => {
  const hasActivity = data.some((point) => point.dau > 0 || point.wau > 0);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-title text-ink">Active people</h2>
        <span className="flex flex-wrap gap-4 text-small text-ink-2">
          <span className="flex items-center gap-2">
            <span aria-hidden="true" className="h-0.75 w-4 rounded-full bg-forest" />
            In the last 7 days
          </span>
          <span className="flex items-center gap-2">
            <span aria-hidden="true" className="size-2.5 rounded-xs bg-mint-200" />
            That day
          </span>
        </span>
      </div>
      {hasActivity ? (
        <div role="img" aria-label="People active each day and in the seven days up to it" className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickFormatter={formatShortDay} fontSize={12} stroke="var(--ink-muted)" minTickGap={24} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={(value: number) => formatNumber(value)} fontSize={12} stroke="var(--ink-muted)" width={36} />
              <Tooltip
                labelFormatter={(day) => formatShortDay(String(day))}
                formatter={(value) => formatNumber(Number(value))}
                contentStyle={{ borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", fontSize: 12 }}
              />
              <Bar dataKey="dau" name="That day" fill="var(--mint-200)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              <Line dataKey="wau" name="In the last 7 days" type="monotone" stroke="var(--forest)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="py-16 text-center text-small text-ink-muted">Nobody signed in during these days.</p>
      )}
    </Card>
  );
};

export default ActivePeopleCard;
