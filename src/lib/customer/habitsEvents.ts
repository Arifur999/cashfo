// A tick on a habit (the daily page, the dashboard's card) tells the menu,
// whose "3/5" on Daily habits would otherwise wait for the next page change.
export const HABITS_CHANGED = "smartly:habits-changed";

export const announceHabitsChanged = () => window.dispatchEvent(new Event(HABITS_CHANGED));
