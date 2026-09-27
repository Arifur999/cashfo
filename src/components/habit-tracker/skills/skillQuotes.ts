// One quote a day on the Skills page banner. Both fields go through t() (see
// dictionary/skills.ts), so each has a Bangla line.
export interface SkillQuote {
  text: string;
  by: string;
}

export const SKILL_QUOTES: SkillQuote[] = [
  { text: "The beautiful thing about learning is that no one can take it away from you.", by: "B.B. King" },
  { text: "It does not matter how slowly you go as long as you do not stop.", by: "Confucius" },
  { text: "My Lord, increase me in knowledge.", by: "Quran 20:114" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", by: "Will Durant" },
  { text: "Anyone who stops learning is old, whether at twenty or eighty.", by: "Henry Ford" },
  { text: "Genius is one percent inspiration and ninety-nine percent perspiration.", by: "Thomas Edison" },
];
