import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  const id = setInterval(onChange, 15_000);
  return () => clearInterval(id);
};

// The current minute, as a number so the snapshot stays the same within it.
const minuteNow = () => Math.floor(Date.now() / 60_000) * 60_000;

// "Now" to the minute, for countdowns. Null on the server and in the first
// render, so server and browser markup agree; the browser fills it in.
export function useMinuteClock(): Date | null {
  const ms = useSyncExternalStore(subscribe, minuteNow, () => null);
  return ms === null ? null : new Date(ms);
}
