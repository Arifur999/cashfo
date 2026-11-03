import Card from "@/components/smartly/Card";
import MiniBars from "@/components/shared/MiniBars";
import { formatCurrency } from "@/lib/currency";
import { formatMonthName } from "@/lib/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { takaSign } from "@/lib/i18n/formatPrefs";
import type { IMrrHistoryPoint } from "@/types/revenue.types";
import T from "@/components/shared/T";
import { getTranslator } from "@/lib/i18n/locale";
import { compactAmount, shortMonthKey } from "./revenueDisplay";

// MRR at the end of each of the last six months, the running month in
// forest. Worked out from payments (the KPI above counts the plans
// workspaces are on, so the two can differ), and labelled in compact taka
// so the bars' figures fit a phone.
const MrrHistoryCard = async ({ history }: { history: IMrrHistoryPoint[] }) => {
  const { t, locale } = await getTranslator("admin");
  const first = history[0]?.mrr ?? 0;
  const last = history[history.length - 1]?.mrr ?? 0;
  const growth = first > 0 ? Math.round(((last - first) / first) * 100) : null;
  const nothing = history.every((point) => point.mrr === 0);

  return (
    <Card padding="none" className="flex flex-col gap-3 px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-title text-ink"><T>MRR at the end of each month</T></h2>
        {growth !== null && history.length > 1 && (
          <span className="text-small text-ink-muted">
            {t(growth >= 0 ? "up {percent}% since {month}" : "down {percent}% since {month}", { percent: formatCount(Math.abs(growth), locale), month: t(formatMonthName(history[0].month)) })}
          </span>
        )}
      </div>
      {nothing ? (
        <p className="py-8 text-center text-small text-ink-muted"><T>No paid months yet.</T></p>
      ) : (
        <MiniBars
          // A screen reader hears the chart's name, then each month with its
          // MRR in whole taka ("October TK 60,400").
          label="MRR at the end of each month"
          height={180}
          gap="6"
          bars={history.map((point, index) => ({
            label: t(shortMonthKey(point.month)),
            value: point.mrr,
            short: `${takaSign(locale)} ${toLocaleDigits(compactAmount(point.mrr), locale)}`,
            highlight: index === history.length - 1,
            spoken: `${t(formatMonthName(point.month))} ${formatCurrency(point.mrr, undefined, 0, locale)}`,
          }))}
        />
      )}
    </Card>
  );
};

export default MrrHistoryCard;
