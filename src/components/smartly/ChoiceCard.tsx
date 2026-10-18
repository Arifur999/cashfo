import { cn } from "@/lib/utils";

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

// One option of a radio group drawn as a card, as the drawers ask how often
// something happens: a round dot, a title and a note.
const ChoiceCard = ({ checked, onSelect, title, sub, subPlacement = "stacked", children }: ChoiceCardProps) => (
  <div className={cn("flex flex-col gap-3 rounded-md border px-4 py-3 transition-colors", checked ? "border-[1.5px] border-emerald bg-mint-50" : "border-line bg-surface hover:border-line-strong")}>
    <span
      role="radio"
      aria-checked={checked}
      tabIndex={0}
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

export default ChoiceCard;
