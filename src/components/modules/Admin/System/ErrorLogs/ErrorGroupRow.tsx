import { ERROR_SOURCE_LABEL, type ErrorGroup, errorRequest } from "@/lib/errorGroups";
import { formatLogTime } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatNumber } from "@/lib/number";
import { cn } from "@/lib/utils";
import { CHIP, ERROR_SEVERITY_CHIP, SOURCE_CHIP } from "./errorChips";
import T from "@/components/shared/T";

interface ErrorGroupRowProps {
  group: ErrorGroup;
  selected: boolean;
  onSelect: () => void;
}

// One problem in the list: severity, where it came from and when it last
// happened, the message, the request, and how many times.
const ErrorGroupRow = ({ group, selected, onSelect }: ErrorGroupRowProps) => {
  const [latest] = group.logs;
  const request = errorRequest(latest);
  const { translate } = useLocale();

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "grid w-full grid-cols-[minmax(0,1fr)_70px] gap-3 border-b border-l-3 border-b-surface-sunken px-5 py-4 text-left transition-colors last:border-b-0",
        selected ? "border-l-emerald bg-mint-50" : "border-l-transparent bg-surface hover:bg-cream",
      )}
    >
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className={cn(CHIP, "font-bold tracking-wide", ERROR_SEVERITY_CHIP[group.severity])}>
            <T>{group.severity}</T>
          </span>
          <span className={cn(CHIP, "font-semibold", SOURCE_CHIP)}><T>{ERROR_SOURCE_LABEL[group.source]}</T></span>
          <span className="text-caption text-ink-muted">{translate("· last {time}", { time: formatLogTime(group.lastAt, { t: translate }) })}</span>
        </span>
        <code className="truncate font-mono text-small font-semibold text-ink">{group.message}</code>
        {request && <span className="truncate text-caption text-ink-muted">{request}</span>}
      </span>
      <span className="flex flex-col items-end justify-center gap-px">
        <b className="text-h3 font-bold text-ink tabular-nums">×{formatNumber(group.logs.length)}</b>
        <span className="text-caption text-ink-muted"><T>{group.logs.length === 1 ? "time" : "times"}</T></span>
      </span>
    </button>
  );
};

export default ErrorGroupRow;
