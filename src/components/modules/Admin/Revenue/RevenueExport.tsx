"use client";

import { useExportAction } from "@/components/shared/ExportAction";
import { datedFileName, downloadCsv } from "@/lib/download";
import { toCsv } from "@/lib/table/csv";
import type { IMrrHistoryPoint } from "@/types/revenue.types";

// What Revenue's Export downloads: MRR at the end of each month, the months
// the chart shows.
const RevenueExport = ({ history }: { history: IMrrHistoryPoint[] }) => {
  useExportAction(() =>
    downloadCsv(
      toCsv(
        ["Month", "MRR"],
        history.map((point) => [point.month, point.mrr]),
      ),
      datedFileName("revenue"),
    ),
  );
  return null;
};

export default RevenueExport;
