"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { SearchX, ShieldCheck } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import FormDrawer from "@/components/shared/dialog/FormDrawer";
import DataTableFacetedFilter from "@/components/shared/table/filters/DataTableFacetedFilter";
import DataTableTextFilter from "@/components/shared/table/filters/DataTableTextFilter";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import EmptyState from "@/components/smartly/EmptyState";
import ErrorState from "@/components/smartly/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { ERROR_SOURCE_LABEL, type ErrorGroup } from "@/lib/errorGroups";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural } from "@/lib/i18n/message";
import { WHEN_OPTIONS } from "@/lib/timeWindows";
import { cn } from "@/lib/utils";
import { errorLogsListQuery } from "@/queries/system.queries";
import type { Severity } from "@/types/securityFlag.types";
import { ERROR_SOURCES, type ErrorSource } from "@/types/system.types";
import { SEVERITY_OPTIONS } from "./errorChips";
import ErrorDetailPanel from "./ErrorDetailPanel";
import ErrorGroupRow from "./ErrorGroupRow";
import { groupBoardErrors } from "./errorOrigin";
import {
  DEFAULT_ERROR_FILTERS,
  type ErrorFilters,
  type ErrorStatus,
  errorsQueryString,
  narrowsErrors,
  readErrorFilters,
  withErrorFilters,
  withoutNarrowing,
} from "./errorsQuery";

const STATUS_OPTIONS = [
  { value: "open", label: "Not fixed" },
  { value: "fixed", label: "Fixed" },
];
// The customer app reports under the admin panel's source, so that choice
// covers both (?app=customer still narrows to it, from a link).
const SOURCE_OPTIONS = ERROR_SOURCES.map((value) => ({ value, label: value === "ADMIN_FRONTEND" ? "Admin panel or customer app" : ERROR_SOURCE_LABEL[value] }));

// The detail panel sits beside the list from xl (1280px); below that a
// picked group opens in a drawer, not in a panel far under a long list.
const SIDE_BY_SIDE = "(min-width: 80rem)";
// Where focus goes once the last group is fixed, and how long a move of
// focus waits for its target to appear.
const EMPTY_TARGET = "";
const FOCUS_WAIT_MS = 3000;

// Errors grouped by message, as the design draws them: the list on the
// left, the picked one in full on the right. The chips live in the address
// bar, so Back and a shared link keep them.
const ErrorsBoard = () => {
  const { translate, locale } = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => readErrorFilters(searchParams), [searchParams]);
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const sideBySide = useMediaQuery(SIDE_BY_SIDE);
  const listRef = useRef<HTMLUListElement>(null);
  const emptyRef = useRef<HTMLDivElement>(null);
  // Focus asked for after a fix. It expires if its target never shows up
  // (a group that stayed after all), so it can't jump somewhere later.
  const pendingFocus = useRef<{ key: string } | null>(null);
  const query = useQuery({ ...errorLogsListQuery(errorsQueryString(filters)), placeholderData: keepPreviousData });
  const { status } = filters;
  const narrowed = narrowsErrors(filters);

  // Replaced in place: Back leaves the page rather than undoing a chip. A
  // new filter starts the detail panel over on the first group.
  const update = (change: Partial<ErrorFilters>) => {
    const rest = withErrorFilters(searchParams, { ...filters, ...change }).toString();
    window.history.replaceState(null, "", rest ? `${pathname}?${rest}` : pathname);
    setPickedKey(null);
  };

  const groups = useMemo(() => groupBoardErrors(query.data?.data ?? []), [query.data]);
  const picked = groups.find((group) => group.key === pickedKey) ?? groups[0];
  const total = query.data?.meta?.total ?? 0;
  const loaded = query.data?.data.length ?? 0;
  const count = (value: number) => formatCount(value, locale);

  const errors = plural(translate, total, "{count} error", "{count} errors", undefined, locale);
  const kinds = plural(translate, groups.length, "{count} kind", "{count} kinds", undefined, locale);
  const summary =
    total > loaded
      ? translate("The newest {loaded} of {errors} · {kinds} · the same message is grouped", { loaded: count(loaded), errors, kinds })
      : translate("{errors} · {kinds} · the same message is grouped", { errors, kinds });

  const focusTarget = (key: string): HTMLElement | null =>
    key === EMPTY_TARGET ? emptyRef.current : ([...(listRef.current?.querySelectorAll<HTMLElement>("[data-group-key]") ?? [])].find((row) => row.dataset.groupKey === key) ?? null);
  const focusPending = () => {
    const pending = pendingFocus.current;
    if (!pending) return;
    const target = focusTarget(pending.key);
    if (!target) return;
    target.focus();
    pendingFocus.current = null;
  };
  const askFocus = (key: string) => {
    const pending = { key };
    pendingFocus.current = pending;
    window.setTimeout(() => {
      if (pendingFocus.current === pending) pendingFocus.current = null;
    }, FOCUS_WAIT_MS);
  };
  // A target that wasn't on screen yet: the empty note after the refetch,
  // or the list once the drawer has gone. A tick later, so it lands after
  // the drawer hands focus back to whatever opened it.
  useEffect(() => {
    if (pendingFocus.current === null) return;
    const timer = window.setTimeout(focusPending, 0);
    return () => window.clearTimeout(timer);
  });

  const pick = (key: string) => {
    setPickedKey(key);
    if (!window.matchMedia(SIDE_BY_SIDE).matches) setDrawerOpen(true);
  };

  // Under "Not fixed" a fixed group leaves the list: the panel moves on to
  // its neighbour and focus goes with it, never down to the page. Elsewhere
  // the group stays, and focus returns to its row.
  const fixed = (group: ErrorGroup) => {
    const index = groups.findIndex((candidate) => candidate.key === group.key);
    const next = status === "open" ? (groups[index + 1] ?? groups[index - 1]) : group;
    setPickedKey(next?.key ?? null);
    askFocus(next?.key ?? EMPTY_TARGET);
    if (drawerOpen) setDrawerOpen(false);
    else focusPending();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <DataTableFacetedFilter
          title="Status"
          options={STATUS_OPTIONS}
          selected={status === "all" ? [] : [status]}
          emptyLabel="All"
          onChange={(values) => update({ status: (values[0] as ErrorStatus | undefined) ?? "all" })}
        />
        <DataTableFacetedFilter
          title="From@@source"
          options={SOURCE_OPTIONS}
          selected={filters.source ? [filters.source] : []}
          emptyLabel="Anywhere"
          onChange={(values) => update({ source: values[0] as ErrorSource | undefined })}
        />
        <DataTableFacetedFilter
          title="Severity"
          options={SEVERITY_OPTIONS}
          selected={filters.severity ? [filters.severity] : []}
          emptyLabel="Any"
          onChange={(values) => update({ severity: values[0] as Severity | undefined })}
        />
        <DataTableFacetedFilter
          title="When"
          options={WHEN_OPTIONS}
          selected={[filters.within]}
          defaultValue={DEFAULT_ERROR_FILTERS.within}
          onChange={(values) => update({ within: values[0] ?? DEFAULT_ERROR_FILTERS.within })}
        />
        {/* The reference a customer quotes from their error screen: an
            exact match, so support lands on the one row behind it. */}
        <DataTableTextFilter label="Error reference" value={filters.digest} onChange={(digest) => update({ digest })} />
        <span className="flex-1" />
        {query.data && <span className="text-small text-ink-muted">{summary}</span>}
      </div>
      {query.isLoading ? (
        <Skeleton className="h-64 rounded-lg" />
      ) : query.isError && !query.data ? (
        // A failed read is never "nothing is broken".
        <ErrorState title={translate("Couldn't load the errors")} onRetry={() => void query.refetch()} className="shadow-card" />
      ) : !picked ? (
        <div ref={emptyRef} tabIndex={-1} className="rounded-lg">
          {narrowed ? (
            <EmptyState
              icon={<SearchX />}
              title={translate("No errors match these filters.")}
              action={
                <Button variant="secondary" size="sm" onClick={() => update(withoutNarrowing(filters))}>
                  {translate("Clear filters")}
                </Button>
              }
              className="shadow-card"
            />
          ) : (
            <EmptyState icon={<ShieldCheck />} title={translate(status === "open" ? "Nothing is broken right now." : "No errors here.")} className="shadow-card" />
          )}
        </div>
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_540px]">
          <Card padding="none" className="relative overflow-hidden">
            {/* Another filter's results are on their way: the old ones dim. */}
            {query.isFetching && <div aria-hidden="true" className="absolute inset-x-0 top-0 z-10 h-0.5 animate-pulse bg-primary" />}
            <ul
              ref={listRef}
              aria-label={translate("Errors")}
              aria-busy={query.isPlaceholderData || undefined}
              className={cn("divide-y divide-divider transition-opacity", query.isPlaceholderData && "opacity-60")}
            >
              {groups.map((group) => (
                <li key={group.key}>
                  {/* Marked only while its detail shows: beside the list from xl, or
                      in the drawer below it -- never a highlight with
                      nothing open. */}
                  <ErrorGroupRow
                    group={group}
                    selected={group.key === picked.key && (sideBySide || drawerOpen)}
                    shownBeside={group.key === picked.key}
                    onSelect={() => pick(group.key)}
                  />
                </li>
              ))}
            </ul>
          </Card>
          <div className="hidden xl:block">
            <ErrorDetailPanel key={picked.key} group={picked} onFixed={fixed} />
          </div>
        </div>
      )}
      {/* Mounted only while open, so closing it hands focus straight back. */}
      {drawerOpen && !sideBySide && picked && (
        <FormDrawer
          open
          onOpenChange={(open) => {
            if (!open) setDrawerOpen(false);
          }}
          title="Error details"
          centered
          width="lg"
          closeOnOutsideClick
        >
          <ErrorDetailPanel key={picked.key} group={picked} inDrawer onFixed={fixed} />
        </FormDrawer>
      )}
    </div>
  );
};

export default ErrorsBoard;
