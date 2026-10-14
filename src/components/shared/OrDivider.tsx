"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";

// "──── or ────" between two alternative ways of doing the same thing.
const OrDivider = ({ label = "or" }: { label?: string }) => {
  const { translate } = useLocale();

  return (
    <div className="flex items-center gap-3 text-small text-ink-muted">
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
      {translate(label)}
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
    </div>
  );
};

export default OrDivider;
