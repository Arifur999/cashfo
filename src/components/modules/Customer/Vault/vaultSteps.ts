"use client";

import { useSearchParams } from "next/navigation";

// Steps inside the open vault -- the security checkup, the Add or Edit login
// drawer, a login's sheet on a phone -- live in the address, so the
// browser's Back (or Android's back gesture) closes them instead of leaving
// the page, which would lock the vault. Next keeps useSearchParams in step
// with pushState and replaceState.
export const VAULT_STEPS = ["checkup", "entry", "login"] as const;

// What a step's own history entry carries beside Next's keys: the step it
// opened, how many steps this page stacked up to and including it, and the
// page load that pushed it. Kept in the entry, not in memory, so it outlives
// a lock. Back from an entry that a reload brought back would load the page
// again (locking the vault), so only this load's marks go back with Back.
interface StepMark {
  vaultStep: string;
  vaultSteps: number;
  vaultLoad: number;
}

// The current entry's mark, when this page load made it.
function currentMark(): StepMark | null {
  const state: Partial<StepMark> | null = window.history.state;
  if (!state || typeof state.vaultStep !== "string" || typeof state.vaultSteps !== "number" || state.vaultLoad !== performance.timeOrigin) return null;
  return { vaultStep: state.vaultStep, vaultSteps: state.vaultSteps, vaultLoad: state.vaultLoad };
}

// What a replaceState keeps of the entry: its mark, never Next's own keys.
// Handed those, Next takes the call for its own and skips it, and
// useSearchParams would not follow the address.
const keptMark = (): Partial<StepMark> => currentMark() ?? {};

// The address with query values set, or taken off where a value is null.
function withQuery(changes: Record<string, string | null>): string {
  const params = new URLSearchParams(window.location.search);
  for (const [name, value] of Object.entries(changes)) {
    if (value === null) params.delete(name);
    else params.set(name, value);
  }
  const query = params.toString();
  return query ? `?${query}` : window.location.pathname;
}

// A Back asked for lands a moment later. Until it does, a second close (a
// double tap) must not go back again, past the page itself.
let backPending = false;

function goBack(entries: number) {
  if (backPending) return;
  backPending = true;
  window.addEventListener(
    "popstate",
    () => {
      backPending = false;
    },
    { once: true },
  );
  window.history.go(-entries);
}

// Takes a one-off flag (?new=1) off the address without a new history entry.
export function dropQuery(name: string) {
  if (new URLSearchParams(window.location.search).has(name)) window.history.replaceState(keptMark(), "", withQuery({ [name]: null }));
}

// Opens a step as a new history entry, so Back closes it. One already open
// takes the new value where it is.
export function openStep(name: string, value: string) {
  const params = new URLSearchParams(window.location.search);
  if (params.get(name) === value) return;
  if (params.has(name)) {
    window.history.replaceState(keptMark(), "", withQuery({ [name]: value }));
    return;
  }
  const mark: StepMark = { vaultStep: name, vaultSteps: (currentMark()?.vaultSteps ?? 0) + 1, vaultLoad: performance.timeOrigin };
  window.history.pushState(mark, "", withQuery({ [name]: value }));
}

// Closes a step. One this load opened goes the way Back would take it, so
// Back after it doesn't land on the same step again; any other (an address
// opened as it is, or one from before a reload) just leaves the address.
export function closeStep(name: string) {
  if (backPending || !new URLSearchParams(window.location.search).has(name)) return;
  if (currentMark()?.vaultStep === name) goBack(1);
  else window.history.replaceState(keptMark(), "", withQuery({ [name]: null }));
}

// Turns the open step `from` into `to` where it stands -- a login saved in
// the drawer opening in its sheet -- so Back goes where it would have gone,
// with no Back and push racing each other. When `to` already shows that
// value under it (the drawer was opened from that sheet), closing `from`
// goes back to it.
export function swapStep(from: string, to: string, value: string) {
  const params = new URLSearchParams(window.location.search);
  const mark = currentMark();
  if (params.get(to) === value) {
    closeStep(from);
  } else if (mark?.vaultStep === from && params.has(from)) {
    window.history.replaceState({ ...mark, vaultStep: to }, "", withQuery({ [from]: null, [to]: value }));
  } else {
    closeStep(from);
    openStep(to, value);
  }
}

// The steps belong to the open vault. Locked, the address goes back to the
// page's own entry, so Back from the lock screen leaves the page and the
// next unlock starts on the list. Steps from before a reload (Back to them
// would load the page again) just leave the address.
export function unwindSteps() {
  if (backPending) return;
  const mark = currentMark();
  if (mark) goBack(mark.vaultSteps);
  else window.history.replaceState({}, "", withQuery(Object.fromEntries(VAULT_STEPS.map((name) => [name, null]))));
}

// The page's view of the steps: what the address holds, and the moves.
export function useVaultSteps() {
  const searchParams = useSearchParams();
  return { value: (name: string) => searchParams.get(name), open: openStep, close: closeStep, swap: swapStep };
}
