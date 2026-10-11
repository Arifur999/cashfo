"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

// Opens the browser's print dialog -- which also offers "Save as PDF". The
// dashboard chrome carries print:hidden, so only the document prints.
const PrintButton = ({ label = "Print / Save as PDF" }: { label?: string }) => {
  return (
    <Button variant="outline" onClick={() => window.print()} className="print:hidden">
      <Printer aria-hidden="true" />
      {label}
    </Button>
  );
};

export default PrintButton;
