"use client";

import { Printer } from "lucide-react";
import Button, { type ButtonProps } from "@/components/smartly/Button";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface PrintButtonProps {
  label?: string;
  // The design's secondary button unless told otherwise: "action" is the
  // emerald one (an invoice's sidebar).
  variant?: ButtonProps["variant"];
  className?: string;
}

// Opens the browser's print dialog -- which also offers "Save as PDF". The
// dashboard chrome carries print:hidden, so only the document prints.
const PrintButton = ({ label = "Print / Save as PDF", variant = "secondary", className }: PrintButtonProps) => {
  const { translate } = useLocale();
  return (
    <Button variant={variant} onClick={() => window.print()} className={cn("print:hidden", className)}>
      <Printer aria-hidden="true" />
      {translate(label)}
    </Button>
  );
};

export default PrintButton;
