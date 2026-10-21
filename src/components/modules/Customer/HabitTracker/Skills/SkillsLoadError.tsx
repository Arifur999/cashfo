"use client";

import { HabitLoadError } from "../Tracker/HabitLoadError";

// Shown when the skills couldn't be fetched -- never an empty page, which would
// look like "all my skills are gone".
export function SkillsLoadError() {
  return <HabitLoadError title="Skills" message="We couldn't load your skills just now." />;
}
