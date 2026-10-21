"use client";

import { useQuery } from "@tanstack/react-query";
import { SearchX, ShieldCheck } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { SEVERITY_OPTIONS } from "@/components/modules/Admin/System/ErrorLogs/errorChips";
import DataTableFacetedFilter from "@/components/shared/table/filters/DataTableFacetedFilter";
import Button from "@/components/smartly/Button";
import EmptyState from "@/components/smartly/EmptyState";
import ErrorState from "@/components/smartly/ErrorState";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { isOpenFlag } from "@/lib/securityFlags";
import { securityFlagsQuery } from "@/queries/security.queries";
import type { FlagStatus, ISecurityFlag, Severity } from "@/types/securityFlag.types";
import FlagCard from "./FlagCard";
import { type FlagFilters, type FlagView, readFlagFilters, showsFlag, withFlagFilters } from "./flagFilters";

const EMPTY: Record<FlagView, string> = {
  open: "Nothing needs a look right now.",
  closed: "No closed flags yet.",
  all: "Nothing has been flagged yet.",
};

// Where focus goes once the last card of a view is gone, and how long a
// move of focus waits for its target to appear.
const EMPTY_TARGET = "";
const FOCUS_WAIT_MS = 3000;

// Suspicious activity as cards, open ones first (the API's order). The whole
// list comes in one go, so the status and severity filters work in place;
// they live in the address bar, so Back from "See the tries" keeps them.
const FlagsBoard = () => {
  const { translate, locale } = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => readFlagFilters(searchParams), [searchParams]);
  const query = useQuery(securityFlagsQuery());
  const listRef = useRef<HTMLUListElement>(null);
  const emptyRef = useRef<HTMLDivElement>(null);
  // Focus asked for after a status change. It expires if its target never
  // shows up, so it can't jump somewhere later.
  const pendingFocus = useRef<{ id: string } | null>(null);

  const flags = query.data?.data ?? [];
  const openCount = flags.filter(isOpenFlag).length;
  const shown = flags.filter((flag) => showsFlag(flag, filters));

  // Replaced in place: Back leaves the page rather than undoing a chip.
  const update = (change: Partial<FlagFilters>) => {
    const rest = withFlagFilters(searchParams, { ...filters, ...change }).toString();
    window.history.replaceState(null, "", rest ? `${pathname}?${rest}` : pathname);
  };

  const focusTarget = (id: string): HTMLElement | null =>
    id === EMPTY_TARGET ? emptyRef.current : ([...(listRef.current?.querySelectorAll<HTMLElement>("[data-flag-id]") ?? [])].find((card) => card.dataset.flagId === id) ?? null);
  const focusPending = () => {
    const pending = pendingFocus.current;
    if (!pending) return;
    const target = focusTarget(pending.id);
    if (!target) return;
    target.focus();
    pendingFocus.current = null;
  };
  const askFocus = (id: string) => {
    const pending = { id };
    pendingFocus.current = pending;
    window.setTimeout(() => {
      if (pendingFocus.current === pending) pendingFocus.current = null;
    }, FOCUS_WAIT_MS);
    focusPending();
  };
  // A target that wasn't on screen yet (the empty note, after the refetch).
  useEffect(() => {
    focusPending();
  });

  // A card whose new status takes it out of this view goes away: focus
  // moves to its neighbour, or the empty note, never down to the page.
  const changed = (flag: ISecurityFlag, status: FlagStatus) => {
    const stays = showsFlag({ ...flag, status }, filters);
    const index = shown.findIndex((item) => item.id === flag.id);
    const next = stays ? flag : (shown[index + 1] ?? shown[index - 1]);
    askFocus(next?.id ?? EMPTY_TARGET);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl<FlagView>
          label="Status"
          value={filters.view}
          onChange={(view) => update({ view })}
          options={[
            { value: "open", label: query.data ? translate("Needs a look · {count}", { count: formatCount(openCount, locale) }) : translate("Needs a look") },
            { value: "closed", label: "Closed" },
            { value: "all", label: "All" },
          ]}
        />
        <DataTableFacetedFilter
          title="Severity"
          options={SEVERITY_OPTIONS}
          selected={filters.severities}
          onChange={(values) => update({ severities: values as Severity[] })}
          multiple
          emptyLabel="Any"
        />
      </div>
      {query.isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : query.isError && !query.data ? (
        // A failed read is never "nothing needs a look".
        <ErrorState title={translate("Couldn't load suspicious activity")} onRetry={() => void query.refetch()} className="shadow-card" />
      ) : shown.length === 0 ? (
        <div ref={emptyRef} tabIndex={-1} className="rounded-lg">
          {filters.severities.length > 0 ? (
            <EmptyState
              icon={<SearchX />}
              title={translate("No flags match these filters.")}
              action={
                <Button variant="secondary" size="sm" onClick={() => update({ severities: [] })}>
                  {translate("Clear filter")}
                </Button>
              }
              className="shadow-card"
            />
          ) : (
            <EmptyState icon={<ShieldCheck />} title={translate(EMPTY[filters.view])} className="shadow-card" />
          )}
        </div>
      ) : (
        <ul ref={listRef} className="flex flex-col gap-3">
          {shown.map((flag) => (
            <li key={flag.id}>
              <FlagCard flag={flag} onChanged={changed} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FlagsBoard;
