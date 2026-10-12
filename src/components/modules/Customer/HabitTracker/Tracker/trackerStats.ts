// Headline numbers for a tracker sheet, derived from its checks (the
// optimistic ones the grid shows), so the summary moves with every tick.
export interface TrackerStats {
  cells: number; // days x items
  ticks: number;
  overallPct: number;
  perfectDays: number; // days on which EVERY item was ticked
  bestDay: number; // 0 when nothing is ticked
  bestPct: number;
  doneByItem: Map<string, number>;
}

export function trackerStats(items: string[], totalDays: number, checks: { day: number; item: string }[]): TrackerStats {
  const cells = totalDays * items.length;
  const ticks = checks.length;
  const overallPct = cells > 0 ? Math.round((ticks / cells) * 100) : 0;

  const doneByDay = new Array<number>(totalDays + 1).fill(0);
  const doneByItem = new Map<string, number>();
  for (const c of checks) {
    doneByDay[c.day] += 1;
    doneByItem.set(c.item, (doneByItem.get(c.item) ?? 0) + 1);
  }

  let bestDay = 0;
  let bestCount = 0;
  let perfectDays = 0;
  for (let day = 1; day <= totalDays; day++) {
    if (doneByDay[day] > bestCount) {
      bestCount = doneByDay[day];
      bestDay = day;
    }
    if (items.length > 0 && doneByDay[day] === items.length) perfectDays += 1;
  }
  const bestPct = items.length > 0 ? Math.round((bestCount / items.length) * 100) : 0;

  return { cells, ticks, overallPct, perfectDays, bestDay, bestPct, doneByItem };
}
