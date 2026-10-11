"use client";

import DonutChart from "@/components/shared/charts/DonutChart";
import SectionCard from "@/components/shared/SectionCard";
import { formatNumber } from "@/lib/number";
import { humanizeEnum } from "@/lib/statusBadge";
import type { IDeviceBreakdownEntry } from "@/types/analytics.types";
import { DEVICE_COLORS } from "./analyticsLabels";

const DeviceBreakdownCard = ({ data }: { data: IDeviceBreakdownEntry[] }) => {
  const total = data.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <SectionCard title="Devices" tooltip="Share of all sign-in sessions by device type, from each session's browser.">
      <DonutChart
        slices={data.map((entry) => ({
          key: entry.deviceType,
          label: humanizeEnum(entry.deviceType),
          value: entry.count,
          color: DEVICE_COLORS[entry.deviceType],
        }))}
        ariaLabel="Sessions by device type"
        centerValue={formatNumber(total)}
        centerLabel="sessions"
        emptyMessage="No sessions recorded yet."
      />
    </SectionCard>
  );
};

export default DeviceBreakdownCard;
