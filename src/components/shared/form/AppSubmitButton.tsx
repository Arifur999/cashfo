"use client";

import Loader from "@/components/shared/Loader";
import Button, { type ButtonProps } from "@/components/smartly/Button";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

type AppSubmitButtonProps = {
  isPending: boolean;
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
  // "action" is the emerald button of a dialog or card foot; "default" the
  // forest one of a page or a sign-in form.
  variant?: "default" | "action" | "destructive";
  size?: ButtonProps["size"];
};

// Full width by default (auth forms); modals pass className="w-auto".
const AppSubmitButton = ({ isPending, children, pendingLabel, className, disabled, variant = "default", size = "lg" }: AppSubmitButtonProps) => {
  const { translate } = useLocale();
  const label = translate(pendingLabel ?? "Submitting...");

  return (
    <Button
      type="submit"
      variant={variant === "destructive" ? "danger" : variant === "action" ? "action" : "primary"}
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
      ) : typeof children === "string" ? (
        translate(children)
      ) : (
        children
      )}
    </Button>
  );
};

export default AppSubmitButton;
