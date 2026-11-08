// Colours and icons a skill can have. The keys match the backend's
// SKILL_COLORS / SKILL_ICONS (backend/src/skills/skill-options.ts) -- keep the
// lists in sync.
export interface SkillPalette {
  key: string;
  label: string; // English, passed through t()
  from: string; // tile gradient start
  to: string; // tile gradient end
  ink: string; // icon colour on the tile
}

// The v16 Skills boards' eight colours (violet, sky, green, pink, amber,
// teal, red, indigo), each darkening to 62% of itself; slate stays for the
// skills that have it.
export const SKILL_PALETTE: SkillPalette[] = [
  { key: "violet", label: "Violet", from: "#7c3aed", to: "#4d2493", ink: "#ffffff" },
  { key: "sky", label: "Sky", from: "#0284c7", to: "#01527b", ink: "#ffffff" },
  { key: "lime", label: "Green", from: "#16a34a", to: "#0e652e", ink: "#ffffff" },
  { key: "rose", label: "Pink", from: "#db2777", to: "#88184a", ink: "#ffffff" },
  { key: "amber", label: "Amber", from: "#d97706", to: "#874a04", ink: "#ffffff" },
  { key: "teal", label: "Teal", from: "#0f766e", to: "#094944", ink: "#ffffff" },
  { key: "red", label: "Red", from: "#dc2626", to: "#881818", ink: "#ffffff" },
  { key: "indigo", label: "Indigo", from: "#4f46e5", to: "#312b8e", ink: "#ffffff" },
  { key: "slate", label: "Slate", from: "#475569", to: "#2c3541", ink: "#ffffff" },
];

// The eight a form offers (slate is kept, not offered).
export const SKILL_PICKER = SKILL_PALETTE.filter((p) => p.key !== "slate");

// Picker order; the label is what the icon stands for (through t()).
export const SKILL_ICONS: { key: string; label: string }[] = [
  { key: "sparkles", label: "General" },
  { key: "code", label: "Coding" },
  { key: "palette", label: "Art & design" },
  { key: "music", label: "Music" },
  { key: "languages", label: "Languages" },
  { key: "camera", label: "Photography" },
  { key: "dumbbell", label: "Fitness" },
  { key: "pen", label: "Writing" },
  { key: "calculator", label: "Math" },
  { key: "brain", label: "Thinking" },
  { key: "chef", label: "Cooking" },
  { key: "briefcase", label: "Career" },
  { key: "graduation", label: "Study" },
];

export function paletteFor(key: string): SkillPalette {
  return SKILL_PALETTE.find((p) => p.key === key) ?? SKILL_PALETTE[0];
}

// A stable colour for a name, so a new skill starts out looking like itself
// until the learner picks one.
export function suggestColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return SKILL_PALETTE[hash % SKILL_PALETTE.length].key;
}
