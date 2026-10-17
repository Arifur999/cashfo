"use client";

import { formatNumber } from "@/lib/number";
import T from "../T";

// "Showing 1–10 of 1,284", the figures in ink, as every list footer in the
// design says it. `children` words it for one list:
// "Showing {range} of {total} payments".
const ShowingRange = ({ first, last, total, children = "Showing {range} of {total}" }: { first: number; last: number; total: number; children?: string }) => (
  <T
    values={{
      range: (
        <b className="font-semibold text-ink">
          {formatNumber(first)}–{formatNumber(last)}
        </b>
      ),
      total: <b className="font-semibold text-ink">{formatNumber(total)}</b>,
    }}
  >
    {children}
  </T>
);

export default ShowingRange;
