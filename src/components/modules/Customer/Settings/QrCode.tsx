"use client";

import { useMemo } from "react";
import { encodeQr, qrPath } from "@/lib/qr";

interface QrCodeProps {
  // What the code holds (the otpauth:// link).
  value: string;
  // Drawn size in px.
  size?: number;
  label: string;
}

const QUIET = 2;

// A QR code drawn in the browser (the app's own encoder, lib/qr.ts), so the
// secret never leaves the page for an image service. Always dark on white
// with a quiet zone, so a phone's camera reads it in dark mode too. Null
// when the text is too long for a code (the key below it still works).
export function QrCode({ value, size = 168, label }: QrCodeProps) {
  const drawn = useMemo(() => {
    const modules = encodeQr(value);
    return modules ? { path: qrPath(modules, QUIET), cells: modules.length + QUIET * 2 } : null;
  }, [value]);
  if (!drawn) return null;

  return (
    <svg role="img" aria-label={label} width={size} height={size} viewBox={`0 0 ${drawn.cells} ${drawn.cells}`} shapeRendering="crispEdges" className="shrink-0 rounded-md border border-line bg-white">
      <rect width={drawn.cells} height={drawn.cells} fill="#ffffff" />
      <path d={drawn.path} fill="#12201d" />
    </svg>
  );
}
