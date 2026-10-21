import T from "@/components/shared/T";
import { formatLogTime } from "@/lib/date";
import { type ErrorGroup, ERROR_SOURCE_LABEL, errorRequest } from "@/lib/errorGroups";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CHIP, ERROR_SEVERITY_CHIP, SOURCE_CHIP } from "./errorChips";

interface ErrorGroupRowProps {
  group: ErrorGroup;
  selected: boolean;
  onSelect: () => void;
}

// One problem in the list: severity, where it came from and when it last
// happened, the message, the request, and how many times. The list draws
// the dividers; the focus ring is drawn inset, where the card's clipped
// edge can't cut it.
const ErrorGroupRow = ({ group, selected, onSelect }: ErrorGroupRowProps) => {
  const [latest] = group.logs;
  const request = errorRequest(latest);
  const { translate, locale } = useLocale();

  return (
    <button
      type="button"
      aria-pressed={selected}
      data-group-key={group.key}
      onClick={onSelect}
      className={cn(
        "grid w-full grid-cols-[minmax(0,1fr)_70px] gap-3 border-l-3 px-5 py-4 text-left transition-colors focus-visible:-outline-offset-2",
        selected ? "border-l-emerald bg-mint-50" : "border-l-transparent bg-surface hover:bg-hover",
      )}
    >
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          {/* Letter-spacing suits the English capitals, not Bangla. */}
          <span className={cn(CHIP, "font-bold", locale === "en" && "tracking-wide", ERROR_SEVERITY_CHIP[group.severity])}>
            <T>{group.severity}</T>
          </span>
          <span className={cn(CHIP, "font-semibold", SOURCE_CHIP)}>
            <T>{ERROR_SOURCE_LABEL[group.source]}</T>
          </span>
          <span className="text-caption text-ink-muted">{translate("· last {time}", { time: formatLogTime(group.lastAt, { t: translate }) })}</span>
        </span>
        <code className="truncate font-mono text-small font-semibold text-ink">{group.message}</code>
        {request && <span className="truncate text-caption text-ink-muted">{request}</span>}
      </span>
      <span className="flex flex-col items-end justify-center gap-px">
        <b className="text-h3 font-bold text-ink tabular-nums">×{formatCount(group.logs.length, locale)}</b>
        <span className="text-caption text-ink-muted">
          <T>{group.logs.length === 1 ? "time" : "times"}</T>
        </span>
      </span>
    </button>
  );
};

export default ErrorGroupRow;
