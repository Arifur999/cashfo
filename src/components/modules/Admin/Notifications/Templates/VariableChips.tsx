"use client";

import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface VariableChipsProps {
  variables: string[];
  // The field a tap adds to (the one last focused), already translated.
  targetLabel: string;
  onPick: (placeholder: string) => void;
}

// The placeholders a template may use, each one tap to add where the caret
// is in the field last focused -- so typing them by hand (and mistyping
// them) isn't needed. The hint names that field.
const VariableChips = ({ variables, targetLabel, onPick }: VariableChipsProps) => {
  const { translate } = useLocale();
  if (variables.length === 0) {
    return <p className="text-small text-ink-muted"><T>This template takes no variables.</T></p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-small text-ink-muted">{translate("Tap to add to {field}:", { field: targetLabel })}</span>
      {variables.map((name) => {
        const placeholder = `{{${name}}}`;
        return (
          <button
            key={name}
            type="button"
            // The field keeps its caret: the press mustn't take focus first.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onPick(placeholder)}
            className="h-7 rounded-full border border-line-strong bg-strip px-3 font-mono text-caption text-ink-2 hover:bg-surface-sunken pointer-coarse:h-11"
          >
            {placeholder}
          </button>
        );
      })}
    </div>
  );
};

export default VariableChips;
