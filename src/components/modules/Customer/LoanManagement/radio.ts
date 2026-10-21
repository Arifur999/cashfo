import type { KeyboardEvent } from "react";

// The option an arrow key moves to in a radio group: the next or previous
// one that can be picked, wrapping round; Home and End the first and last.
// Null for any other key, or when nothing can be picked.
export function nextRadioValue<T>(values: readonly T[], current: T, key: string, disabled: (value: T) => boolean = () => false): T | null {
  const open = values.filter((value) => !disabled(value));
  if (open.length === 0) return null;
  const at = open.indexOf(current);
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return open[(at + 1) % open.length];
    case "ArrowLeft":
    case "ArrowUp":
      return open[at <= 0 ? open.length - 1 : at - 1];
    case "Home":
      return open[0];
    case "End":
      return open[open.length - 1];
    default:
      return null;
  }
}

interface RadioGroupState<T extends string> {
  values: readonly T[];
  value: T;
  onChange: (value: T) => void;
  // An option that can't be picked right now (it still shows, with why).
  disabled?: (value: T) => boolean;
}

const never = () => false;

// What one option of a radio group drawn as buttons needs: the radio role
// and its checked state, one tab stop for the whole group (the checked
// option, else the first that can be picked), and the arrow keys moving the
// choice and focus together, as a native radio group does. Spread it onto
// the button; the group itself is a role="radiogroup" named by its legend.
export function radioProps<T extends string>(option: T, { values, value, onChange, disabled = never }: RadioGroupState<T>) {
  const tabStop = values.includes(value) && !disabled(value) ? value : values.find((candidate) => !disabled(candidate));
  return {
    type: "button" as const,
    role: "radio" as const,
    "aria-checked": option === value,
    "aria-disabled": disabled(option) || undefined,
    "data-radio": option,
    tabIndex: option === tabStop ? 0 : -1,
    onClick: () => {
      if (!disabled(option)) onChange(option);
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      const next = nextRadioValue(values, option, event.key, disabled);
      if (next === null) return;
      event.preventDefault();
      onChange(next);
      event.currentTarget.closest('[role="radiogroup"]')?.querySelector<HTMLElement>(`[data-radio="${next}"]`)?.focus();
    },
  };
}
