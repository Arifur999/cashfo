"use client";

import T from "@/components/shared/T";
import Card from "@/components/smartly/Card";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { IGeography } from "@/types/analytics.types";
import { ListPlaceholder, ReportError, type ReportQuery } from "./ReportState";

const PLACES_SHOWN = 5;

// Where people sign in from, by country: the top five and everyone else.
// The API places addresses offline with MaxMind's GeoLite2 data, whose
// licence (CC BY-SA 4.0) asks for the credit at the foot. The people count
// is the API's totalUsers, each customer once however many countries they
// were seen in; an API from before it sent one gets each country's people
// added up.
// totalUsers is optional here until IGeography carries it.
type Geography = IGeography & { totalUsers?: number };

const PlacesCard = ({ data, query, inPeriod }: { data: Geography | undefined; query: ReportQuery; inPeriod: string }) => {
  const { locale } = useLocale();
  const countries = data?.countries ?? [];
  const people = data?.totalUsers ?? countries.reduce((sum, entry) => sum + entry.userCount, 0);
  const top = countries.slice(0, PLACES_SHOWN).map((entry) => ({ name: entry.country, count: entry.userCount }));
  const rest = countries.slice(PLACES_SHOWN).reduce((sum, entry) => sum + entry.userCount, 0);
  const rows = rest > 0 ? [...top, { name: "Other places", count: rest }] : top;
  const most = Math.max(1, ...rows.map((row) => row.count));

  return (
    <Card className="flex flex-col gap-2.5 px-5 py-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-title text-ink">
          <T>Where they are</T>
        </h2>
        {query.status === "ready" && (
          <span className="text-[12.5px] leading-[normal] text-ink-muted">{people > 0 ? <T values={{ count: formatCount(people, locale), period: inPeriod }}>{"{count} active people {period}"}</T> : <T values={{ period: inPeriod }}>{"Nobody was active {period}"}</T>}</span>
        )}
      </div>
      {query.status === "pending" && <ListPlaceholder rows={4} />}
      {query.status === "error" && <ReportError onRetry={query.retry} />}
      {query.status === "ready" && rows.length > 0 && (
        <ul className="flex flex-col gap-2.5">
          {rows.map((row) => (
            <li key={row.name} className="grid grid-cols-[96px_minmax(0,1fr)_72px] items-center gap-2.5 text-small">
              <span className="truncate text-ink">
                <T>{row.name}</T>
              </span>
              <span aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-surface-sunken">
                <span className="block h-full rounded-full bg-forest" style={{ width: `${(row.count / most) * 100}%` }} />
              </span>
              <span className="text-right tabular-nums">
                <b className="font-semibold text-ink">{toLocaleDigits(`${Math.round((row.count / Math.max(people, 1)) * 100)}%`, locale)}</b>{" "}
                <span className="text-ink-muted">{formatCount(row.count, locale)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <span className="text-caption text-ink-muted">
        <T
          values={{
            maxmind: (
              <a href="https://www.maxmind.com" target="_blank" rel="noopener noreferrer" className="underline">
                MaxMind
              </a>
            ),
          }}
        >
          {"Places from GeoLite2 by {maxmind}."}
        </T>
      </span>
    </Card>
  );
};

export default PlacesCard;
