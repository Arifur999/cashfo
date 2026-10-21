"use client";

import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatNumber } from "@/lib/number";
import { pageRange } from "@/lib/table/pageParams";
import T from "../T";

type ShowingRangeProps = {
  total: number;
  // The sentence for one list: "Showing {range} of {total} payments".
  children?: string;
} & (
  // The page on show and its size: pageRange works the range out, so a
  // stale ?page=99 reads "41–50 of 50", never "981–50".
  | { page: number; pageSize: number; first?: never; last?: never }
  // A range already worked out by pageRange (a DataTableSimplePager summary's).
  | { first: number; last: number; page?: never; pageSize?: never }
);

// "Showing 1–10 of 1,284", the figures in ink and in the reader's digits,
// as every list footer in the design says it (the shared Pagination's own
// summary reads the same).
const ShowingRange = ({ total, children = "Showing {range} of {total}", ...at }: ShowingRangeProps) => {
  const { locale } = useLocale();
  const { first, last } = at.page === undefined ? at : pageRange(at.page, at.pageSize, total);
  return (
    <T
      values={{
        range: <b className="font-semibold text-ink">{toLocaleDigits(`${formatNumber(first)}–${formatNumber(last)}`, locale)}</b>,
        total: <b className="font-semibold text-ink">{formatCount(total, locale)}</b>,
      }}
    >
      {children}
    </T>
  );
};

export default ShowingRange;
