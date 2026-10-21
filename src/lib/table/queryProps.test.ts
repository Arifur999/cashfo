import { describe, expect, it, vi } from "vitest";
import { toTableQueryProps } from "./queryProps";

const meta = { page: 2, limit: 10, total: 54, totalPage: 6 };

describe("toTableQueryProps", () => {
  it("passes the list's meta and loading state through", () => {
    expect(toTableQueryProps({ data: { meta }, isLoading: false, isFetching: true })).toMatchObject({ meta, isLoading: false, isFetching: true, isError: false });
  });

  it("reports a failed read only while there is nothing to show", () => {
    expect(toTableQueryProps({ isLoading: false, isFetching: false, isError: true }).isError).toBe(true);
    // A refetch that failed keeps the rows it has.
    expect(toTableQueryProps({ data: { meta }, isLoading: false, isFetching: false, isError: true }).isError).toBe(false);
  });

  it("retries with the query's own refetch", () => {
    const refetch = vi.fn(() => Promise.resolve());
    const { onRetry } = toTableQueryProps({ isLoading: false, isFetching: false, isError: true, refetch });
    onRetry?.();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("offers no retry without a refetch", () => {
    expect(toTableQueryProps({ isLoading: true, isFetching: true }).onRetry).toBeUndefined();
  });
});
