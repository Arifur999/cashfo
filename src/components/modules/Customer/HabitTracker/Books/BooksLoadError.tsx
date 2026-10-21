"use client";

import { HabitLoadError } from "../Tracker/HabitLoadError";

// Shown when the library couldn't be fetched -- never an empty library, which
// would look like "all my books are gone".
export function BooksLoadError() {
  return <HabitLoadError title="My library" message="We couldn't load your library just now." />;
}
