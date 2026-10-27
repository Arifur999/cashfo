import StatePanel from "./StatePanel";
import type { Tone } from "./tones";

interface EmptyStateProps {
  icon: React.ReactNode;
  tone?: Tone | "white";
  title: React.ReactNode;
  description?: React.ReactNode;
  // Usually one primary button: "New transaction".
  action?: React.ReactNode;
  bordered?: boolean;
  className?: string;
}

// Nothing here yet: one sentence, one action, on plain white with the icon
// on the primary's tint (design-v4 LedgerEmpty).
const EmptyState = ({ tone = "money", ...props }: EmptyStateProps) => <StatePanel tone={tone} {...props} />;

export default EmptyState;
