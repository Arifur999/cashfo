"use client";

import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { VARIABLE_LABELS } from "../notificationOptions";

interface VariableChipsProps {
  variables: string[];
  // The field a tap adds to (the one last focused), already translated.
  targetLabel: string;
  onPick: (placeholder: string) => void;
}

// The placeholders a template may use, each one tap to add where the caret
// is in the field last focused -- so typing them by hand (and mistyping
// them) isn't needed. A chip says what it holds ("Name"); the placeholder it
// adds is in its title. The hint names that field.
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
            title={placeholder}
            aria-label={translate("Add {name}", { name: VARIABLE_LABELS[name] ? translate(VARIABLE_LABELS[name]) : placeholder })}
            className="flex h-7 items-center gap-1 rounded-full border border-line-strong bg-strip px-3 text-caption font-semibold text-ink-2 hover:bg-surface-sunken pointer-coarse:h-11"
          >
            <span aria-hidden="true">+</span>
            {VARIABLE_LABELS[name] ? translate(VARIABLE_LABELS[name]) : placeholder}
          </button>
        );
      })}
    </div>
  );
};

export default VariableChips;
