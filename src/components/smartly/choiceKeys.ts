// Where a key moves the choice in a radio group of `count` options, from the
// one at `index`: the arrows step to the next or previous one, wrapping
// round; Home and End go to the first and last. Null for any other key, or
// when `index` isn't one of them.
export function nextChoiceIndex(index: number, count: number, key: string): number | null {
  if (index < 0 || index >= count) return null;
  switch (key) {
    case "ArrowDown":
    case "ArrowRight":
      return (index + 1) % count;
    case "ArrowUp":
    case "ArrowLeft":
      return (index - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}
