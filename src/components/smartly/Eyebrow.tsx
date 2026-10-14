import { cn } from "@/lib/utils";
import { TONE_TEXT, type Tone } from "./tones";

interface EyebrowProps extends React.ComponentProps<"span"> {
  // The pillar the page or section belongs to; its colour names it.
  tone?: Tone;
}

// The small capitals above a heading: the pillar name, a date, a pattern.
const Eyebrow = ({ tone = "money", className, ...props }: EyebrowProps) => (
  <span className={cn("block text-overline uppercase", TONE_TEXT[tone], className)} {...props} />
);

export default Eyebrow;
