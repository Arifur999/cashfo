"use client";

import Loader from "@/components/shared/Loader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AppSubmitButtonProps = {
  isPending: boolean;
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
  variant?: "default" | "destructive";
};

// Full width by default (auth forms); modals pass className="w-auto".
const AppSubmitButton = ({ isPending, children, pendingLabel, className, disabled, variant = "default" }: AppSubmitButtonProps) => {
  const label = pendingLabel ?? "Submitting...";

  return (
    <Button
      type="submit"
      variant={variant}
      disabled={disabled || isPending}
      aria-busy={isPending}
      className={cn("w-full", className)}
    >
      {isPending ? (
        <>
          {/* The light spinner only reads on the solid primary button. */}
          <Loader size={16} onDark={variant === "default"} label={label} />
          <span className="animate-pulse">{label}</span>
        </>
      ) : (
        children
      )}
    </Button>
  );
};

export default AppSubmitButton;
