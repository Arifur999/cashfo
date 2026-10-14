"use client";

import Loader from "@/components/shared/Loader";
import Button, { type ButtonProps } from "@/components/smartly/Button";
import { cn } from "@/lib/utils";

type AppSubmitButtonProps = {
  isPending: boolean;
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
  variant?: "default" | "destructive";
  size?: ButtonProps["size"];
};

// Full width by default (auth forms); modals pass className="w-auto".
const AppSubmitButton = ({ isPending, children, pendingLabel, className, disabled, variant = "default", size = "lg" }: AppSubmitButtonProps) => {
  const label = pendingLabel ?? "Submitting...";

  return (
    <Button
      type="submit"
      variant={variant === "destructive" ? "danger" : "primary"}
      size={size}
      disabled={disabled || isPending}
      aria-busy={isPending}
      className={cn("w-full", className)}
    >
      {isPending ? (
        <>
          <Loader size={16} onDark label={label} />
          <span className="animate-pulse">{label}</span>
        </>
      ) : (
        children
      )}
    </Button>
  );
};

export default AppSubmitButton;
