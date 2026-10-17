// Moves the item with id `from` to where `to` is, the rest keeping their
// order: what dropping one row on another means in a dragged list.
export const moveItem = <T extends { id: string }>(items: T[], from: string, to: string): T[] => {
  const fromIndex = items.findIndex((item) => item.id === from);
  const toIndex = items.findIndex((item) => item.id === to);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return items;
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
};

// The positions to save after a move: each item's place from 1, for the
// items whose place changed.
export const changedOrder = <T extends { id: string; displayOrder: number }>(items: T[]): { id: string; displayOrder: number }[] =>
  items.flatMap((item, index) => (item.displayOrder === index + 1 ? [] : [{ id: item.id, displayOrder: index + 1 }]));
