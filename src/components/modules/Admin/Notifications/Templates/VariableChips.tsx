"use client";

import T from "@/components/shared/T";

// The placeholders a template may use, each one tap to add to the field
// last typed in -- so typing them by hand (and mistyping them) isn't needed.
const VariableChips = ({ variables, onPick }: { variables: string[]; onPick: (placeholder: string) => void }) => {
  if (variables.length === 0) {
    return <p className="text-small text-ink-muted"><T>This template takes no variables.</T></p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-small text-ink-muted"><T>Tap to add:</T></span>
      {variables.map((name) => {
        const placeholder = `{{${name}}}`;
        return (
          <button
            key={name}
            type="button"
            onClick={() => onPick(placeholder)}
            className="h-7 rounded-full border border-line-strong bg-cream px-3 font-mono text-caption text-ink-2 hover:bg-surface-sunken"
          >
            {placeholder}
          </button>
        );
      })}
    </div>
  );
};

export default VariableChips;
