"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  // Right-aligned page-level actions (usually a Create button).
  actions?: React.ReactNode;
}

// The admin page title as the design draws it: 28px, the one-line
// description under it, actions on the right.
const PageHeader = ({ title, description, actions }: PageHeaderProps) => {
  const { translate } = useLocale();
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-h1 text-ink">{typeof title === "string" ? translate(title) : title}</h1>
        {description && <p className="text-body text-ink-muted">{typeof description === "string" ? translate(description) : description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
};

export default PageHeader;
