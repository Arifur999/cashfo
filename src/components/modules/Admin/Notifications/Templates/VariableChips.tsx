"use client";

import { toast } from "sonner";

// The placeholders a template may use, each one click to copy -- so typing
// them by hand (and mistyping them) isn't needed.
const VariableChips = ({ variables }: { variables: string[] }) => {
  if (variables.length === 0) {
    return <p className="text-xs text-muted-foreground">This template takes no variables.</p>;
  }

  const copy = async (placeholder: string) => {
    try {
      await navigator.clipboard.writeText(placeholder);
      toast.success(`Copied ${placeholder}`);
    } catch {
      toast.error("Couldn't copy -- type it in by hand.");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Variables:</span>
      {variables.map((name) => {
        const placeholder = `{{${name}}}`;
        return (
          <button
            key={name}
            type="button"
            onClick={() => copy(placeholder)}
            className="rounded-md border bg-muted/50 px-1.5 py-0.5 font-mono text-xs text-foreground hover:bg-muted"
            title="Copy"
          >
            {placeholder}
          </button>
        );
      })}
    </div>
  );
};

export default VariableChips;
