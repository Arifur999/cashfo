"use client";

import { formatDayName, formatElapsed, formatLogTime, formatRecentDateTime, formatRelativeDateTime, formatRelativeDay } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const FORMATS = {
  // "Today, 11:42 am", "Yesterday", "30 Sep"
  day: formatRelativeDay,
  // "Today, 2:10 pm", "Yesterday, 6:55 pm", "27 Sep, 1:03 pm"
  dateTime: formatRelativeDateTime,
  // the time while recent, then the day
  recent: formatRecentDateTime,
  // "Today", "Yesterday", "28 Sep"
  dayName: formatDayName,
  // "2:48 pm" today, else with the day
  log: formatLogTime,
  // "35 min", "2 h", "3 days"
  elapsed: formatElapsed,
} as const;

interface RelativeTimeProps {
  value: string | number | Date | null | undefined;
  as?: keyof typeof FORMATS;
  fallback?: string;
}

// A date the way lib/date.ts words it, with "Today" and "Yesterday" in the
// reader's language -- for table cells and other places without a hook.
const RelativeTime = ({ value, as = "dateTime", fallback }: RelativeTimeProps) => {
  const { translate } = useLocale();
  return FORMATS[as](value, { t: translate, fallback });
};

export default RelativeTime;
