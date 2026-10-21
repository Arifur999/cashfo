import { describe, expect, it } from "vitest";
import { buildTableQueryString } from "@/lib/queryString";
import { claimExport, collectAllRows, EXPORT_PAGES_PER_MINUTE, EXPORT_ROW_CAP, exportPageQuery, type ExportPage } from "./exportAll";

interface Item {
  id: string;
}

// A list of `count` rows (r1, r2, ...) served `size` a page, like the API:
// meta.totalPage is 0 for an empty list.
const fakeList = (count: number, size = 100) => {
  const items: Item[] = Array.from({ length: count }, (_, index) => ({ id: `r${index + 1}` }));
  const requested: number[] = [];
  const fetchPage = async (page: number): Promise<ExportPage<Item>> => {
    requested.push(page);
    return { rows: items.slice((page - 1) * size, page * size), meta: { page, limit: size, total: count, totalPage: Math.ceil(count / size) } };
  };
  return { fetchPage, requested };
};

// A clock that only moves when the export sleeps, so pacing is exact, and
// a request log of its own: the shared one holds real times.
const fakeTimer = () => {
  let clock = 0;
  const sleeps: number[] = [];
  const started: number[] = [];
  return {
    sleeps,
    started,
    now: () => clock,
    sleep: async (ms: number) => {
      sleeps.push(ms);
      clock += ms;
    },
  };
};

describe("collectAllRows", () => {
  it("reads every page in order and stops at the last", async () => {
    const list = fakeList(250);
    const result = await collectAllRows(list.fetchPage, fakeTimer());
    expect(list.requested).toEqual([1, 2, 3]);
    expect(result.rows).toHaveLength(250);
    expect(result.rows.at(-1)).toEqual({ id: "r250" });
    expect(result).toMatchObject({ total: 250, capped: false, incomplete: false });
  });

  it("asks for one page of an empty list", async () => {
    const list = fakeList(0);
    const result = await collectAllRows(list.fetchPage, fakeTimer());
    expect(list.requested).toEqual([1]);
    expect(result).toEqual({ rows: [], total: 0, capped: false, incomplete: false });
  });

  it("stops at 10,000 rows and says how many matched", async () => {
    const list = fakeList(12_345);
    const result = await collectAllRows(list.fetchPage, fakeTimer());
    expect(list.requested).toHaveLength(EXPORT_ROW_CAP / 100);
    expect(result.rows).toHaveLength(EXPORT_ROW_CAP);
    // The cap explains the shortfall; nothing else went missing.
    expect(result).toMatchObject({ total: 12_345, capped: true, incomplete: false });
  });

  it("trims a cap that falls inside a page", async () => {
    const list = fakeList(1_000);
    const result = await collectAllRows(list.fetchPage, { ...fakeTimer(), cap: 250 });
    expect(list.requested).toEqual([1, 2, 3]);
    expect(result.rows).toHaveLength(250);
    expect(result).toMatchObject({ total: 1_000, capped: true });
  });

  it("isn't capped by a list of exactly the cap", async () => {
    const result = await collectAllRows(fakeList(200).fetchPage, { ...fakeTimer(), cap: 200 });
    expect(result.rows).toHaveLength(200);
    expect(result).toMatchObject({ capped: false, incomplete: false });
  });

  it("stops on an empty page even when the meta promises more", async () => {
    const requested: number[] = [];
    const fetchPage = async (page: number): Promise<ExportPage<Item>> => {
      requested.push(page);
      return { rows: page === 1 ? [{ id: "a" }] : [], meta: { page, limit: 100, total: 500, totalPage: 5 } };
    };
    const result = await collectAllRows(fetchPage, fakeTimer());
    expect(requested).toEqual([1, 2]);
    // One row of the 500 the API counted: the file can't pass for all of them.
    expect(result).toMatchObject({ rows: [{ id: "a" }], total: 500, capped: false, incomplete: true });
  });

  it("without a meta, stops at the first page that isn't full", async () => {
    const items = Array.from({ length: 150 }, (_, index) => ({ id: `r${index}` }));
    const requested: number[] = [];
    const fetchPage = async (page: number): Promise<ExportPage<Item>> => {
      requested.push(page);
      return { rows: items.slice((page - 1) * 100, page * 100) };
    };
    const result = await collectAllRows(fetchPage, fakeTimer());
    expect(requested).toEqual([1, 2]);
    expect(result).toMatchObject({ total: 150, capped: false, incomplete: false });
  });

  it("drops a row that a later page repeats", async () => {
    // A row added mid-export pushes r2 from page 1 onto page 2 as well.
    const pages: Item[][] = [[{ id: "r1" }, { id: "r2" }], [{ id: "r2" }, { id: "r3" }], [{ id: "r4" }]];
    const fetchPage = async (page: number): Promise<ExportPage<Item>> => ({ rows: pages[page - 1], meta: { page, limit: 2, total: 5, totalPage: 3 } });
    const result = await collectAllRows(fetchPage, { ...fakeTimer(), pageSize: 2, getId: (row) => row.id });
    expect(result.rows.map((row) => row.id)).toEqual(["r1", "r2", "r3", "r4"]);
    // The added row landed on page 1, already read: four of the five.
    expect(result).toMatchObject({ total: 5, capped: false, incomplete: true });
  });

  it("says a row went missing when the list lost one mid-export", async () => {
    // r1 is deleted once page 1 is read, which pulls r3 onto page 1: page 2
    // starts at r4, r3 is never read, and the count falls to 4.
    const pages: Item[][] = [[{ id: "r1" }, { id: "r2" }], [{ id: "r4" }, { id: "r5" }]];
    const totals = [5, 4];
    const fetchPage = async (page: number): Promise<ExportPage<Item>> => {
      const total = totals[page - 1];
      return { rows: pages[page - 1], meta: { page, limit: 2, total, totalPage: Math.ceil(total / 2) } };
    };
    const result = await collectAllRows(fetchPage, { ...fakeTimer(), pageSize: 2, getId: (row) => row.id });
    expect(result.rows.map((row) => row.id)).toEqual(["r1", "r2", "r4", "r5"]);
    // Four rows match the last count, but five matched when the export began.
    expect(result).toMatchObject({ total: 5, capped: false, incomplete: true });
  });

  it("keeps every row without a getId", async () => {
    const pages: Item[][] = [[{ id: "r1" }], [{ id: "r1" }]];
    const fetchPage = async (page: number): Promise<ExportPage<Item>> => ({ rows: pages[page - 1], meta: { page, limit: 1, total: 2, totalPage: 2 } });
    const result = await collectAllRows(fetchPage, { ...fakeTimer(), pageSize: 1 });
    expect(result.rows).toHaveLength(2);
  });

  it("ends at the page bound when pages come back shorter than asked", async () => {
    // The API serving 50 a page although 100 were asked for.
    const list = fakeList(20_000, 50);
    const result = await collectAllRows(list.fetchPage, fakeTimer());
    expect(list.requested).toHaveLength(100);
    expect(result.rows).toHaveLength(5_000);
    expect(result).toMatchObject({ total: 20_000, capped: true });
  });

  it("reports progress after every page but the last", async () => {
    const progress: [number, number][] = [];
    await collectAllRows(fakeList(250).fetchPage, { ...fakeTimer(), onProgress: (done, total) => progress.push([done, total]) });
    expect(progress).toEqual([
      [100, 250],
      [200, 250],
    ]);
  });

  it("never sends more than the minute's share of requests", async () => {
    const timer = fakeTimer();
    const startedAt: number[] = [];
    const list = fakeList(400);
    const pauses: number[] = [];
    await collectAllRows(
      async (page) => {
        startedAt.push(timer.now());
        return list.fetchPage(page);
      },
      { ...timer, pagesPerMinute: 2, onPause: (ms) => pauses.push(ms) },
    );
    // Two at once, then each later pair a minute (and a second) on.
    expect(startedAt).toEqual([0, 0, 61_000, 61_000]);
    expect(timer.sleeps).toEqual([61_000]);
    expect(pauses).toEqual([61_000]);
  });

  it("doesn't pause an export inside the minute's share", async () => {
    const timer = fakeTimer();
    await collectAllRows(fakeList(EXPORT_PAGES_PER_MINUTE * 100).fetchPage, timer);
    expect(timer.sleeps).toEqual([]);
  });

  it("carries one export's minute into the next", async () => {
    // One clock and one request log, as every export in a tab shares them.
    const timer = fakeTimer();
    await collectAllRows(fakeList(200).fetchPage, { ...timer, pagesPerMinute: 2 });
    const startedAt: number[] = [];
    const list = fakeList(100);
    await collectAllRows(
      async (page) => {
        startedAt.push(timer.now());
        return list.fetchPage(page);
      },
      { ...timer, pagesPerMinute: 2 },
    );
    // The first export's two requests used the minute up, so the second
    // waits for it before its first page.
    expect(startedAt).toEqual([61_000]);
    expect(timer.sleeps).toEqual([61_000]);
  });

  it("keeps only the last minute's share in the log", async () => {
    const timer = fakeTimer();
    await collectAllRows(fakeList(500).fetchPage, { ...timer, pagesPerMinute: 2 });
    expect(timer.started).toHaveLength(2);
  });

  it("stops once called off and hands back none of the rows", async () => {
    const controller = new AbortController();
    const list = fakeList(500);
    const fetchPage = async (page: number) => {
      const result = await list.fetchPage(page);
      // The admin leaves the page while page 2 loads.
      if (page === 2) controller.abort();
      return result;
    };
    await expect(collectAllRows(fetchPage, { ...fakeTimer(), signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
    expect(list.requested).toEqual([1, 2]);
  });

  it("hands back nothing when called off during the last page", async () => {
    // Every row has arrived, but the page they were for has gone.
    const controller = new AbortController();
    const list = fakeList(200);
    const fetchPage = async (page: number) => {
      const result = await list.fetchPage(page);
      if (page === 2) controller.abort();
      return result;
    };
    await expect(collectAllRows(fetchPage, { ...fakeTimer(), signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
  });

  it("ends a pause as soon as it's called off", async () => {
    // The real timer, and a log a previous export filled: this one would
    // wait a minute before its first page, and a test only five seconds.
    const controller = new AbortController();
    const list = fakeList(100);
    const pending = collectAllRows(list.fetchPage, {
      now: () => 0,
      started: [0, 0],
      pagesPerMinute: 2,
      signal: controller.signal,
      onPause: () => setTimeout(() => controller.abort(), 0),
    });
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(list.requested).toEqual([]);
  });
});

describe("claimExport", () => {
  it("holds the one export slot until it's freed", () => {
    const release = claimExport();
    expect(release).not.toBeNull();
    expect(claimExport()).toBeNull();
    release?.();
    const next = claimExport();
    expect(next).not.toBeNull();
    next?.();
  });

  // An export called off frees the slot at once, then again when its last
  // request returns; the second time must leave the next export's hold be.
  it("frees it once, whoever holds it now", () => {
    const first = claimExport();
    first?.();
    const second = claimExport();
    expect(second).not.toBeNull();
    first?.();
    expect(claimExport()).toBeNull();
    second?.();
    const third = claimExport();
    expect(third).not.toBeNull();
    third?.();
  });
});

describe("exportPageQuery", () => {
  const config = { queryKeys: ["search", "status", "gateway", "dateFrom", "sort"], defaultLimit: 10, defaults: { sort: "lastActive" } };

  it("keeps the list's filters and asks for a full page", () => {
    const query = new URLSearchParams(exportPageQuery(new URLSearchParams("search=rahim&status=ACTIVE&page=3&limit=10"), config, 2));
    expect(query.get("page")).toBe("2");
    expect(query.get("limit")).toBe("100");
    expect(query.get("search")).toBe("rahim");
    expect(query.get("status")).toBe("ACTIVE");
  });

  it("fills in the list's defaults like the table does", () => {
    expect(new URLSearchParams(exportPageQuery(new URLSearchParams(), config, 1)).get("sort")).toBe("lastActive");
    expect(new URLSearchParams(exportPageQuery(new URLSearchParams("sort=name"), config, 1)).get("sort")).toBe("name");
  });

  it("keeps repeated keys and drops what the endpoint doesn't take", () => {
    const query = new URLSearchParams(exportPageQuery(new URLSearchParams("gateway=BKASH&gateway=NAGAD&utm_source=mail"), config, 1));
    expect(query.getAll("gateway")).toEqual(["BKASH", "NAGAD"]);
    expect(query.has("utm_source")).toBe(false);
  });

  it("sends what the table itself would send for that page at 100 rows", () => {
    const source = new URLSearchParams("dateFrom=2026-10-01&status=ACTIVE");
    expect(exportPageQuery(source, config, 4)).toBe(buildTableQueryString(new URLSearchParams("dateFrom=2026-10-01&status=ACTIVE&page=4&limit=100"), config));
  });
});
