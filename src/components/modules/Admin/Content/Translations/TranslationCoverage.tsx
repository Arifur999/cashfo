"use client";

import { useQuery } from "@tanstack/react-query";
import StatsGrid from "@/components/shared/StatsGrid";
import { formatNumber, formatPercent } from "@/lib/number";
import { translationsQuery } from "@/queries/translation.queries";
import { isMissingBangla } from "./translationFilters";

// Derived from the cached list, so it follows every inline edit.
const TranslationCoverage = () => {
  const translations = useQuery(translationsQuery()).data?.data;
  const total = translations?.length;
  const missing = translations?.filter(isMissingBangla).length;
  const coverage = total ? ((total - (missing ?? 0)) / total) * 100 : undefined;

  return (
    <StatsGrid
      columns={3}
      items={[
        { title: "Strings", value: formatNumber(total), iconName: "FileText" },
        { title: "Bangla Coverage", value: formatPercent(coverage, 0), iconName: "BarChart3" },
        { title: "Missing Bangla", value: formatNumber(missing), iconName: "AlertTriangle", description: "The app's own text shows until translated" },
      ]}
    />
  );
};

export default TranslationCoverage;
