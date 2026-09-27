// One quote a day on the Others page banner. Both fields go through t() (see
// dictionary/habit-tracker.ts), so each has a Bangla line.
export interface OtherQuote {
  text: string;
  by: string;
}

export const OTHER_QUOTES: OtherQuote[] = [
  { text: "You do not rise to the level of your goals. You fall to the level of your systems.", by: "James Clear" },
  { text: "Chains of habit are too light to be felt until they are too heavy to be broken.", by: "Warren Buffett" },
  { text: "First we make our habits, then our habits make us.", by: "John Dryden" },
  { text: "Motivation is what gets you started. Habit is what keeps you going.", by: "Jim Ryun" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", by: "Robert Collier" },
  { text: "Nothing is stronger than habit.", by: "Ovid" },
];
