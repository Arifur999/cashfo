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

// Nothing here yet: one sentence, one action, on the fresh wash.
const EmptyState = ({ tone = "white", ...props }: EmptyStateProps) => <StatePanel tone={tone} background="fresh" {...props} />;

export default EmptyState;
