"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { nextChoiceIndex } from "./choiceKeys";

interface ChoiceCardProps {
  checked: boolean;
  onSelect: () => void;
  title: React.ReactNode;
  // A note beside the title ("inline") or under it ("stacked").
  sub?: React.ReactNode;
  subPlacement?: "inline" | "stacked";
  // What opens under a picked card, like the weekdays of "On certain days".
  children?: React.ReactNode;
}

// True inside a ChoiceCardGroup, whose cards share one tab stop.
const InGroup = createContext(false);

const RADIO = "[data-slot=choice-card-radio]";
const GROUP = "[data-slot=choice-card-group]";

// The group's own cards, in order; not those of a group inside one of them.
const radiosIn = (group: HTMLElement) => Array.from(group.querySelectorAll<HTMLElement>(RADIO)).filter((radio) => radio.closest(GROUP) === group);

// The radio is only the title line, so the card draws the focus ring, the
// design's 2px ring 2px off, while the radio has keyboard focus.
const FOCUS = [
  "has-[[data-slot=choice-card-radio]:focus-visible]:outline-2",
  "has-[[data-slot=choice-card-radio]:focus-visible]:outline-offset-2",
  "has-[[data-slot=choice-card-radio]:focus-visible]:outline-(--focus-ring)",
].join(" ");

// One option of a radio group drawn as a card, as the drawers ask how often
// something happens: a round dot, a title and a note. A question's cards go
// in a ChoiceCardGroup, which makes them one radio group for the keyboard.
const ChoiceCard = ({ checked, onSelect, title, sub, subPlacement = "stacked", children }: ChoiceCardProps) => {
  const inGroup = useContext(InGroup);
  return (
    <div className={cn("flex flex-col gap-3 rounded-md border px-4 py-3 transition-colors", FOCUS, checked ? "border-[1.5px] border-emerald bg-mint-50" : "border-line bg-surface hover:border-line-strong")}>
      <span
        role="radio"
        data-slot="choice-card-radio"
        aria-checked={checked}
        // In a group only the checked card is a tab stop; on its own, each is.
        tabIndex={inGroup && !checked ? -1 : 0}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            onSelect();
          }
        }}
        className="flex cursor-pointer items-center gap-3 outline-none"
      >
        <span className={cn("flex size-4.5 shrink-0 items-center justify-center rounded-full border bg-surface", checked ? "border-2 border-emerald" : "border-[1.5px] border-line-strong")}>
          <span className={cn("size-2 rounded-full", checked ? "bg-emerald" : "bg-transparent")} />
        </span>
        <span className={cn("flex", subPlacement === "inline" ? "flex-wrap items-baseline gap-x-3" : "flex-col gap-px")}>
          <span className="text-body font-semibold text-ink">{title}</span>
          {sub && <span className="text-small text-ink-muted">{sub}</span>}
        </span>
      </span>
      {checked && children}
    </div>
  );
};

// The cards answering one question, as one radio group: Tab reaches the
// checked card (the first while none is) and the arrow keys move the choice,
// as native radios do; keys pressed in a card's own controls stay theirs.
// Name it with aria-label, or aria-labelledby pointing at its legend. The
// cards stack 8px apart unless className says otherwise.
export const ChoiceCardGroup = ({ className, onKeyDown, children, ...props }: Omit<React.ComponentProps<"div">, "ref" | "role">) => {
  const ref = useRef<HTMLDivElement>(null);

  // Only the group knows when no card is checked, so it keeps the tab stops
  // itself: the checked card's, else the first one's.
  useEffect(() => {
    const radios = ref.current ? radiosIn(ref.current) : [];
    const stop = Math.max(0, radios.findIndex((radio) => radio.getAttribute("aria-checked") === "true"));
    radios.forEach((radio, index) => {
      radio.tabIndex = index === stop ? 0 : -1;
    });
  });

  return (
    <div
      {...props}
      ref={ref}
      role="radiogroup"
      data-slot="choice-card-group"
      onKeyDown={(event) => {
        onKeyDown?.(event);
        const target = event.target;
        if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !(target instanceof HTMLElement) || !target.matches(RADIO)) return;
        const radios = radiosIn(event.currentTarget);
        const next = nextChoiceIndex(radios.indexOf(target), radios.length, event.key);
        if (next === null) return;
        event.preventDefault();
        // The click picks it, through the card's own onSelect.
        radios[next].focus();
        radios[next].click();
      }}
      className={cn("flex flex-col gap-2", className)}
    >
      <InGroup.Provider value>{children}</InGroup.Provider>
    </div>
  );
};

export default ChoiceCard;
