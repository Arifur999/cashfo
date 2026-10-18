"use client";

import { Eye, EyeOff } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface PasswordRevealButtonProps {
  visible: boolean;
  onToggle: () => void;
  // Fills the frame's height: 36 in a 44px field, 44 in a 52px one.
  // "auth" follows the sign-up fields: 44px on a phone, 36px wider;
  // "signIn" the sign-in ones, 44px throughout.
  size?: "sm" | "lg" | "auth" | "signIn";
}

// Goes in AppField's `append` slot of a password input.
const PasswordRevealButton = ({ visible, onToggle, size = "sm" }: PasswordRevealButtonProps) => {
  const { translate } = useLocale();

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={translate(visible ? "Hide password" : "Show password")}
      aria-pressed={visible}
      className={cn("flex shrink-0 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-sunken hover:text-ink", size === "lg" || size === "signIn" ? "size-11 rounded-md" : size === "auth" ? "size-11 rounded-md md:size-9 md:rounded-sm" : "size-9")}
    >
      {visible ? <EyeOff className="size-4.5" aria-hidden="true" /> : <Eye className="size-4.5" aria-hidden="true" />}
    </button>
  );
};

export default PasswordRevealButton;
