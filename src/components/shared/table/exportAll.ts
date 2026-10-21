import { buildTableQueryString } from "@/lib/queryString";
import type { PaginationMeta } from "@/types/api.types";

// Export of every row a server list matches, read a page at a time with the
// list's own fetch. Plain and unit-tested; useTableExport wires it to the
// page header's Export button.

// The API's largest page.
export const EXPORT_PAGE_SIZE = 100;
// The most rows one file holds: 100 pages.
export const EXPORT_ROW_CAP = 10_000;
// The API takes 100 requests a minute from one address; exports use at
// most 60 of them, which leaves the rest for the page they run on.
export const EXPORT_PAGES_PER_MINUTE = 60;
// A second over the minute, for the gap between this clock and the server's.
const LIMIT_WINDOW_MS = 61_000;

// When the latest export requests went out, shared by every export in the
// tab: one started just after another (another list, or the same list
// refiltered) carries on the first one's minute instead of opening a fresh
// one, as two fresh minutes would send the API 120 requests.
const exportRequests: number[] = [];

// One export at a time in the tab, so two never split the minute's requests
// between them or race each other to the download.
let exportHeld = false;

// Takes the export slot: the function that frees it again, or null while
// another export holds it. Freeing it twice does nothing.
export const claimExport = (): (() => void) | null => {
  if (exportHeld) return null;
  exportHeld = true;
  let held = true;
  return () => {
    if (!held) return;
    held = false;
    exportHeld = false;
  };
};

type TableQueryConfig = Parameters<typeof buildTableQueryString>[1];

// One page of the export: the list's filters and order, read exactly as the
// table reads them (buildTableQueryString, defaults included), at the API's
// largest page. useSearchParams() is a URLSearchParams.
export const exportPageQuery = (searchParams: URLSearchParams, config: TableQueryConfig, page: number): string => {
  const params = new URLSearchParams(searchParams.toString());
  params.set("page", String(page));
  params.set("limit", String(EXPORT_PAGE_SIZE));
  return buildTableQueryString(params, config);
};

export interface ExportPage<TData> {
  rows: TData[];
  meta?: PaginationMeta;
}

export interface CollectedRows<TData> {
  rows: TData[];
  // The most rows that matched while the export ran, as the API counted
  // them. The most, not the last count: a row deleted after its page was
  // read lowers the later counts, though the row it pulled onto that page
  // was never read.
  total: number;
  // More matched than one export holds, so rows stops short of them.
  capped: boolean;
  // Fewer rows than matched, with no cap to blame: the list changed between
  // pages (a row added or deleted moves the later pages along, so one is
  // skipped), or rows that sort alike came back in another order.
  incomplete: boolean;
}

export interface CollectOptions<TData> {
  cap?: number;
  pageSize?: number;
  pagesPerMinute?: number;
  // A row a later page repeats is dropped: one added while the export runs
  // pushes the pages after it along by a row.
  getId?: (row: TData) => string;
  // After every page but the last: the rows so far, and how many match.
  onProgress?: (done: number, total: number) => void;
  // Before waiting for the request limit, with how long the wait is.
  onPause?: (ms: number) => void;
  // Calls the export off (the admin left the page): no request after it,
  // and collectAllRows rejects with the signal's reason instead of handing
  // back part of the list.
  signal?: AbortSignal;
  // When the latest requests went out. Every export shares one log; the
  // tests pass their own, beside their own clock.
  started?: number[];
  // A clock and a timer, so the tests needn't wait a minute.
  now?: () => number;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

// Ends early once the export is called off, so a minute's pause doesn't
// outlast the page it ran for.
const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const done = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal?.addEventListener("abort", done, { once: true });
  });

// Reads page after page until the last one, or until the cap. The pages run
// one after another (the client sends Server Functions one at a time
// anyway), never more than pagesPerMinute of them in any minute.
export async function collectAllRows<TData>(
  fetchPage: (page: number) => Promise<ExportPage<TData>>,
  {
    cap = EXPORT_ROW_CAP,
    pageSize = EXPORT_PAGE_SIZE,
    pagesPerMinute = EXPORT_PAGES_PER_MINUTE,
    getId,
    onProgress,
    onPause,
    signal,
    started = exportRequests,
    now = Date.now,
    sleep = wait,
  }: CollectOptions<TData> = {},
): Promise<CollectedRows<TData>> {
  // A bound on the requests too, in case pages come back shorter than asked.
  const maxPages = Math.max(Math.ceil(cap / pageSize), 1);
  const rows: TData[] = [];
  const seen = new Set<string>();
  let total = 0;

  const finish = (kept: TData[], capped: boolean): CollectedRows<TData> => ({ rows: kept, total, capped, incomplete: !capped && kept.length < total });

  for (let page = 1; ; page += 1) {
    if (started.length >= pagesPerMinute) {
      const delay = started[started.length - pagesPerMinute] + LIMIT_WINDOW_MS - now();
      if (delay > 0) {
        onPause?.(delay);
        await sleep(delay, signal);
      }
    }
    // Called off, before the first page or during a pause: no request.
    signal?.throwIfAborted();
    started.push(now());
    // Only the last minute's share is ever looked at.
    if (started.length > pagesPerMinute) started.splice(0, started.length - pagesPerMinute);
    const { rows: pageRows, meta } = await fetchPage(page);
    // Called off while the page loaded: none of the rows go back.
    signal?.throwIfAborted();

    for (const row of pageRows) {
      if (getId) {
        const id = getId(row);
        if (seen.has(id)) continue;
        seen.add(id);
      }
      rows.push(row);
    }
    total = Math.max(total, meta?.total ?? 0, rows.length);

    // The last page is the meta's; without one, the first page not filled.
    const lastPage = typeof meta?.totalPage === "number" ? meta.totalPage : pageRows.length < pageSize ? page : Number.POSITIVE_INFINITY;
    // An empty page ends it whatever the meta says: rows went since.
    const more = pageRows.length > 0 && page < lastPage;
    if (rows.length >= cap || (more && page >= maxPages)) {
      return finish(rows.slice(0, cap), more || rows.length > cap);
    }
    if (!more) {
      return finish(rows, false);
    }
    onProgress?.(rows.length, total);
  }
}
