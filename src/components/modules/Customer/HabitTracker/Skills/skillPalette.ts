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

export const SKILL_PALETTE: SkillPalette[] = [
  { key: "violet", label: "Violet", from: "#8b5cf6", to: "#5b21b6", ink: "#ffffff" },
  { key: "indigo", label: "Indigo", from: "#6366f1", to: "#3730a3", ink: "#ffffff" },
  { key: "lime", label: "Lime", from: "#bef264", to: "#4d7c0f", ink: "#1a2e05" },
  { key: "teal", label: "Teal", from: "#2dd4bf", to: "#0f766e", ink: "#ffffff" },
  { key: "rose", label: "Rose", from: "#fb7185", to: "#be123c", ink: "#ffffff" },
  { key: "amber", label: "Amber", from: "#fbbf24", to: "#b45309", ink: "#3b1d02" },
  { key: "sky", label: "Sky", from: "#38bdf8", to: "#0369a1", ink: "#ffffff" },
  { key: "slate", label: "Slate", from: "#64748b", to: "#1e293b", ink: "#ffffff" },
];

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
