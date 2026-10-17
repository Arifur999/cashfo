import Card from "@/components/smartly/Card";
import { formatNumber } from "@/lib/number";
import type { IGeography } from "@/types/analytics.types";

const PLACES_SHOWN = 5;

// Where people sign in from, by country: the top five and everyone else.
// The API places addresses offline with MaxMind's GeoLite2 data, whose
// licence (CC BY-SA 4.0) asks for the credit at the foot.
const PlacesCard = ({ data }: { data: IGeography }) => {
  const people = data.countries.reduce((sum, entry) => sum + entry.userCount, 0);
  const top = data.countries.slice(0, PLACES_SHOWN).map((entry) => ({ name: entry.country, count: entry.userCount }));
  const rest = data.countries.slice(PLACES_SHOWN).reduce((sum, entry) => sum + entry.userCount, 0);
  const rows = rest > 0 ? [...top, { name: "Other places", count: rest }] : top;
  const most = Math.max(1, ...rows.map((row) => row.count));

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-title text-ink">Where they are</h2>
        <span className="text-small text-ink-muted">{people > 0 ? `${formatNumber(people)} people, by where they sign in` : "Nobody has signed in yet"}</span>
      </div>
      {rows.length > 0 && (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.name} className="grid grid-cols-[96px_minmax(0,1fr)_72px] items-center gap-3 text-small">
              <span className="truncate text-ink">{row.name}</span>
              <span aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-surface-sunken">
                <span className="block h-full rounded-full bg-forest" style={{ width: `${(row.count / most) * 100}%` }} />
              </span>
              <span className="text-right tabular-nums">
                <b className="font-semibold text-ink">{Math.round((row.count / Math.max(people, 1)) * 100)}%</b> <span className="text-ink-muted">{formatNumber(row.count)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <span className="text-caption text-ink-muted">
        Places from GeoLite2 by{" "}
        <a href="https://www.maxmind.com" target="_blank" rel="noopener noreferrer" className="underline">
          MaxMind
        </a>
        .
      </span>
    </Card>
  );
};

export default PlacesCard;
