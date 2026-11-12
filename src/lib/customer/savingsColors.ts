// The card colours of the Savings boards: a goal, a saving plan and a
// savings account each wear one. Muted, deep tones ordered so neighbours
// blend (greens, blues, purples, warm reds, earth, charcoal). Stored
// lowercase by the API (backend savings-goals/goal-colors.ts), as account
// colours are (balanceDisplay.ts); they are data, so the cards mix their
// shades with color-mix() instead of fixed tokens.
export const GOAL_COLORS = [
  { hex: "#235347", name: "Forest" },
  { hex: "#6b8f71", name: "Sage" },
  { hex: "#6b7334", name: "Olive" },
  { hex: "#1f5f66", name: "Teal" },
  { hex: "#2f5d8a", name: "Ocean" },
  { hex: "#2b3a67", name: "Navy" },
  { hex: "#5b3a6e", name: "Plum" },
  { hex: "#a35d72", name: "Rose" },
  { hex: "#7a2e3a", name: "Maroon" },
  { hex: "#b0593a", name: "Terracotta" },
  { hex: "#9c7a30", name: "Gold" },
  { hex: "#6e4f3a", name: "Brown" },
  { hex: "#3a4447", name: "Charcoal" },
] as const;

export function isGoalColor(value: string | null | undefined): value is string {
  const hex = (value ?? "").toLowerCase();
  return GOAL_COLORS.some((color) => color.hex === hex);
}

// A colour by its place in a list, for something that has none of its own.
export function colorAt(index: number): string {
  return GOAL_COLORS[((index % GOAL_COLORS.length) + GOAL_COLORS.length) % GOAL_COLORS.length].hex;
}

// Its own colour, else the one its place in the list gives it.
export function ownColor(color: string | null | undefined, index: number): string {
  return isGoalColor(color) ? color.toLowerCase() : colorAt(index);
}

// The colour's name ("Navy"); "" when it isn't one of them.
export function colorName(hex: string | null | undefined): string {
  return GOAL_COLORS.find((color) => color.hex === (hex ?? "").toLowerCase())?.name ?? "";
}

// The first colour nothing listed wears yet, for something new; once all
// are taken, the next in turn.
export function freshColor(used: readonly (string | null | undefined)[]): string {
  const taken = new Set(used.map((hex) => (hex ?? "").toLowerCase()));
  return GOAL_COLORS.find((color) => !taken.has(color.hex))?.hex ?? colorAt(used.length);
}

// The boards' shade(c, amount): toward black for a negative amount, toward
// white for a positive one. A CSS colour, so it works on a var() too.
export function shade(color: string, amount: number): string {
  const part = Math.round(Math.abs(amount) * 100);
  return `color-mix(in srgb, ${color} ${100 - part}%, ${amount < 0 ? "black" : "white"})`;
}

// The deep panel the boards give a goal, a plan's summary and a savings
// account: a soft glow top right over a diagonal from deep to rich.
export function deepBand(color: string): string {
  return `radial-gradient(120% 140% at 100% 0%, ${shade(color, 0.12)} 0%, transparent 55%), linear-gradient(135deg, ${shade(color, -0.42)} 0%, ${shade(color, -0.12)} 100%)`;
}

// A button in the colour (Add money, Start goal, Resume goal).
export function colorButton(color: string): { background: string; boxShadow: string } {
  return {
    background: `linear-gradient(135deg, ${shade(color, -0.3)} 0%, ${color} 100%)`,
    boxShadow: `0 6px 14px -6px color-mix(in srgb, ${color} 67%, transparent), inset 0 1px 0 rgb(255 255 255 / 0.18)`,
  };
}
