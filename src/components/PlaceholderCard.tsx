interface PlaceholderCardProps {
  title: string;
  description: string;
}

// Shared shell for the /login, /register, /dashboard placeholders built in
// Prompt 1 -- each of these pages becomes real in Prompt 2 (auth) and later
// prompts (the actual dashboard), this just proves routing + design tokens
// (brand palette, rounded-2xl cards, Inter font) work end-to-end for now.
export function PlaceholderCard({ title, description }: PlaceholderCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-content px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg shadow-black/5">
        <h1 className="mb-2 text-xl font-semibold text-neutral-900">{title}</h1>
        <p className="text-sm text-neutral-500">{description}</p>
        <p className="mt-6 text-xs font-medium uppercase tracking-wide text-brand-primary">Coming in Prompt 2</p>
      </div>
    </div>
  );
}
