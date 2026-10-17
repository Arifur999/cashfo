interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  // Right-aligned page-level actions (usually a Create button).
  actions?: React.ReactNode;
}

// The admin page title as the design draws it: 28px, the one-line
// description under it, actions on the right.
const PageHeader = ({ title, description, actions }: PageHeaderProps) => {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-h1 text-ink">{title}</h1>
        {description && <p className="text-body text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
};

export default PageHeader;
