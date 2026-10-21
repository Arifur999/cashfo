"use client";

import { useState } from "react";

// The last row a dialog was opened for, kept after it closes. useRowDialogs
// forgets the row the moment its dialog starts closing, so without this
// the dialog changes while it slides out: "Edit Monthly Pro" turns into
// "New plan", "Delete PUJA15?" into "Delete ?".
export function useHeld<T>(value: T | null): T | null {
  const [held, setHeld] = useState<T | null>(value);
  // Adjusting state during render, React's pattern for following a value.
  if (value !== null && value !== held) setHeld(value);
  return value ?? held;
}
