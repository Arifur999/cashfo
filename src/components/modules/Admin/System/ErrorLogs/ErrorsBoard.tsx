"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import DataTableFacetedFilter from "@/components/shared/table/filters/DataTableFacetedFilter";
import Card from "@/components/smartly/Card";
import { Skeleton } from "@/components/ui/skeleton";
import { groupErrors } from "@/lib/errorGroups";
import { formatNumber } from "@/lib/number";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural } from "@/lib/i18n/message";
import { errorLogsListQuery } from "@/queries/system.queries";
import ErrorDetailPanel from "./ErrorDetailPanel";
import ErrorGroupRow from "./ErrorGroupRow";
import { type ErrorStatus, errorsQueryString } from "./errorsQuery";
import T from "@/components/shared/T";

const STATUS_OPTIONS = [
  { value: "open", label: "Not fixed" },
  { value: "fixed", label: "Fixed" },
];

// Errors grouped by message, as the design draws them: the list on the
// left, the picked one in full on the right.
const ErrorsBoard = () => {
  const { translate } = useLocale();
  const [status, setStatus] = useState<ErrorStatus>("open");
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const query = useQuery({ ...errorLogsListQuery(errorsQueryString(status)), placeholderData: keepPreviousData });

  const groups = useMemo(() => groupErrors(query.data?.data ?? []), [query.data]);
  const picked = groups.find((group) => group.key === pickedKey) ?? groups[0];
  const total = query.data?.meta?.total ?? 0;
  const loaded = query.data?.data.length ?? 0;

  const errors = plural(translate, total, "{count} error", "{count} errors");
  const kinds = plural(translate, groups.length, "{count} kind", "{count} kinds");
  const summary =
    total > loaded
      ? translate("The newest {loaded} of {errors} · {kinds} · the same message is grouped", { loaded: formatNumber(loaded), errors, kinds })
      : translate("{errors} · {kinds} · the same message is grouped", { errors, kinds });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <DataTableFacetedFilter
          title="Status"
          options={STATUS_OPTIONS}
          selected={status === "all" ? [] : [status]}
          emptyLabel="All"
          onChange={(values) => {
            setStatus((values[0] as ErrorStatus | undefined) ?? "all");
            setPickedKey(null);
          }}
        />
        <span className="flex-1" />
        {query.data && <span className="text-small text-ink-muted">{summary}</span>}
      </div>
      {query.isLoading ? (
        <Skeleton className="h-64 rounded-lg" />
      ) : !picked ? (
        <Card className="text-center text-small text-ink-muted"><T>{status === "open" ? "Nothing is broken right now." : "No errors here."}</T></Card>
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_540px]">
          <Card padding="none" className="overflow-hidden">
            <ul aria-label={translate("Errors")}>
              {groups.map((group) => (
                <li key={group.key}>
                  <ErrorGroupRow group={group} selected={group.key === picked.key} onSelect={() => setPickedKey(group.key)} />
                </li>
              ))}
            </ul>
          </Card>
          <ErrorDetailPanel group={picked} />
        </div>
      )}
    </div>
  );
};

export default ErrorsBoard;
