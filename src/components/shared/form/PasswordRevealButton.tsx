"use client";

import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface PasswordRevealButtonProps {
  visible: boolean;
  onToggle: () => void;
}

// Goes in AppField's `append` slot of a password input.
const PasswordRevealButton = ({ visible, onToggle }: PasswordRevealButtonProps) => {
  const { translate } = useLocale();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      onClick={onToggle}
      aria-label={translate(visible ? "Hide password" : "Show password")}
      aria-pressed={visible}
    >
      {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
    </Button>
  );
};

export default PasswordRevealButton;
