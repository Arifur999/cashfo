"use client";

import { SearchX } from "lucide-react";
import Button from "@/components/smartly/Button";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface DataTableEmptyProps {
  message: string;
  canReset: boolean;
  onReset: () => void;
  // Another way out beside "Clear filters" ("Show the last 7 days").
  action?: React.ReactNode;
}

const DataTableEmpty = ({ message, canReset, onReset, action }: DataTableEmptyProps) => {
  const { translate } = useLocale();
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <SearchX className="size-8 text-ink-faint" aria-hidden="true" />
      <p className="text-body text-ink-muted">{translate(message)}</p>
      {(canReset || action) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {canReset && (
            <Button variant="secondary" size="sm" onClick={onReset}>
              {translate("Clear filters")}
            </Button>
          )}
          {action}
        </div>
      )}
    </div>
  );
};

export default DataTableEmpty;
