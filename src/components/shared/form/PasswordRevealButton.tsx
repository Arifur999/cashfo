"use client";

import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PasswordRevealButtonProps {
  visible: boolean;
  onToggle: () => void;
}

// Goes in AppField's `append` slot of a password input.
const PasswordRevealButton = ({ visible, onToggle }: PasswordRevealButtonProps) => {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      onClick={onToggle}
      aria-label={visible ? "Hide password" : "Show password"}
      aria-pressed={visible}
    >
      {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
    </Button>
  );
};

export default PasswordRevealButton;
