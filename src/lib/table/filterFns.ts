import type { FilterFn } from "@tanstack/react-table";
import type { DateRangeValue } from "@/components/shared/table/dataTable.types";

const isDateRange = (value: unknown): value is DateRangeValue =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value) && ("from" in (value as object) || "to" in (value as object));

// Inclusive on both ends, by calendar day: `to` covers the whole day.
const isWithinDateRange = (cellValue: unknown, { from, to }: DateRangeValue) => {
  if (!cellValue) {
    return false;
  }
  const time = new Date(String(cellValue)).getTime();
  if (Number.isNaN(time)) {
    return false;
  }
  if (from && time < new Date(`${from}T00:00:00`).getTime()) {
    return false;
  }
  if (to && time > new Date(`${to}T23:59:59.999`).getTime()) {
    return false;
  }
  return true;
};

// The default filterFn for every in-memory DataTable column, so a columns file
// never picks one per column. It dispatches on the filter value's shape:
//   string[]        -> the cell equals any selected option (faceted filters);
//                      a multi-valued cell matches when any value is selected
//   { from?, to? }  -> the cell's date falls inside the range
//   string          -> case-insensitive "contains"
export const smartColumnFilterFn: FilterFn<unknown> = (row, columnId, filterValue) => {
  const cellValue = row.getValue(columnId);

  if (Array.isArray(filterValue)) {
    if (filterValue.length === 0) {
      return true;
    }
    return Array.isArray(cellValue)
      ? cellValue.some((value) => filterValue.includes(String(value)))
      : filterValue.includes(String(cellValue));
  }
  if (isDateRange(filterValue)) {
    return isWithinDateRange(cellValue, filterValue);
  }
  if (typeof filterValue === "string") {
    return String(cellValue ?? "").toLowerCase().includes(filterValue.toLowerCase());
  }
  return true;
};

// An empty selection / empty range removes the filter instead of matching nothing.
smartColumnFilterFn.autoRemove = (value: unknown) =>
  value === undefined ||
  value === "" ||
  (Array.isArray(value) && value.length === 0) ||
  (isDateRange(value) && !value.from && !value.to);
