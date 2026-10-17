"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  value: string;
  // What's being copied, for the button's accessible name ("Copy password").
  label: string;
  // The button's words ("Copy as JSON"); "Copy" by default.
  text?: string;
  // "md" is the 40px button of a drawer's foot.
  size?: "sm" | "md";
}

const COPIED_FEEDBACK_MS = 2000;

const CopyButton = ({ value, label, text = "Copy", size = "sm" }: CopyButtonProps) => {
  const { translate } = useLocale();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      // Clipboard access needs a secure context and permission; the value is
      // still on screen to copy by hand.
      toast.error("Couldn't copy -- select the text and copy it manually.");
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size={size === "md" ? "default" : "sm"}
      onClick={copy}
      aria-label={`${translate("Copy")} ${translate(label)}`}
      className={cn(size === "md" && "h-10 border-line-strong bg-surface px-4 font-semibold text-ink hover:bg-surface-sunken")}
    >
      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      {translate(copied ? "Copied" : text)}
    </Button>
  );
};

export default CopyButton;
