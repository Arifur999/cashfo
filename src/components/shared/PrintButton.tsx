"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PrintButtonProps {
  label?: string;
  className?: string;
}

// Opens the browser's print dialog -- which also offers "Save as PDF". The
// dashboard chrome carries print:hidden, so only the document prints.
const PrintButton = ({ label = "Print / Save as PDF", className }: PrintButtonProps) => {
  return (
    <Button variant="outline" onClick={() => window.print()} className={cn("print:hidden", className)}>
      <Printer aria-hidden="true" />
      {label}
    </Button>
  );
};

export default PrintButton;
