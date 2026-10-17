"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import DataTableFacetedFilter from "@/components/shared/table/filters/DataTableFacetedFilter";
import Card from "@/components/smartly/Card";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/number";
import { isOpenFlag } from "@/lib/securityFlags";
import { securityFlagsQuery } from "@/queries/security.queries";
import { SEVERITIES } from "@/types/securityFlag.types";
import FlagCard from "./FlagCard";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import T from "@/components/shared/T";

type View = "open" | "closed" | "all";

const SEVERITY_OPTIONS = SEVERITIES.map((severity) => ({ value: severity, label: severity.charAt(0) + severity.slice(1).toLowerCase() }));

const EMPTY: Record<View, string> = {
  open: "Nothing needs a look right now.",
  closed: "No closed flags yet.",
  all: "Nothing has been flagged yet.",
};

// Suspicious activity as cards, open ones first (the API's order). The whole
// list comes in one go, so the status and severity filters work in place.
const FlagsBoard = () => {
  const { translate } = useLocale();
  const { data, isLoading } = useQuery(securityFlagsQuery());
  const [view, setView] = useState<View>("open");
  const [severities, setSeverities] = useState<string[]>([]);

  const flags = data?.data ?? [];
  const openCount = flags.filter(isOpenFlag).length;
  const shown = flags.filter(
    (flag) => (view === "all" || (view === "open") === isOpenFlag(flag)) && (severities.length === 0 || severities.includes(flag.severity)),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl<View>
          label="Status"
          value={view}
          onChange={setView}
          options={[
            { value: "open", label: translate("Needs a look · {count}", { count: formatNumber(openCount) }) },
            { value: "closed", label: "Closed" },
            { value: "all", label: "All" },
          ]}
        />
        <DataTableFacetedFilter title="Severity" options={SEVERITY_OPTIONS} selected={severities} onChange={setSeverities} multiple emptyLabel="Any" />
      </div>
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <Card className="text-center text-small text-ink-muted">
          <T>{EMPTY[view]}</T>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((flag) => (
            <li key={flag.id}>
              <FlagCard flag={flag} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FlagsBoard;
