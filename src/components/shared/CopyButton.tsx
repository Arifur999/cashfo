"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface CopyButtonProps {
  value: string;
  // What's being copied, for the button's accessible name ("Copy password").
  label: string;
}

const COPIED_FEEDBACK_MS = 2000;

const CopyButton = ({ value, label }: CopyButtonProps) => {
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
    <Button type="button" variant="outline" size="sm" onClick={copy} aria-label={`Copy ${label}`}>
      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
};

export default CopyButton;
