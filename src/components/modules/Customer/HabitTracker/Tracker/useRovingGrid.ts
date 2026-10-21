"use client";

import { useCallback, useRef, useState } from "react";

export interface GridCell {
  row: number;
  col: number;
}

const MOVES: Record<string, [number, number]> = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] };

// A month sheet as one Tab stop: Tab lands on one box (today's, to start
// with), the arrow keys move between the boxes that can be pressed, Home
// and End jump to a row's first and last. 155 boxes no longer stand
// between a keyboard and the rest of the page.
export function useRovingGrid(rows: number, cols: number, start: GridCell) {
  const cells = useRef(new Map<string, HTMLButtonElement>());
  const [chosen, setActive] = useState<GridCell>(start);
  // A removed row can take the chosen box with it: the nearest one stands in,
  // so the sheet never loses its Tab stop.
  const active = { row: Math.max(0, Math.min(chosen.row, rows - 1)), col: Math.max(0, Math.min(chosen.col, cols - 1)) };
  const id = (cell: GridCell) => `${cell.row}:${cell.col}`;

  // The ref for one box.
  const ref = useCallback(
    (cell: GridCell) => (node: HTMLButtonElement | null) => {
      if (node) cells.current.set(id(cell), node);
      else cells.current.delete(id(cell));
    },
    [],
  );

  const focus = (cell: GridCell): boolean => {
    const node = cells.current.get(id(cell));
    if (!node || node.disabled) return false;
    node.focus();
    setActive(cell);
    return true;
  };

  function onKeyDown(event: React.KeyboardEvent) {
    // A menu opened from a box is portalled out of the grid, but its keys
    // still bubble here through React: they are the menu's.
    if (!(event.target instanceof Node) || !event.currentTarget.contains(event.target)) return;
    const move = MOVES[event.key];
    if (move) {
      event.preventDefault();
      for (let row = active.row + move[0], col = active.col + move[1]; row >= 0 && row < rows && col >= 0 && col < cols; row += move[0], col += move[1]) {
        if (focus({ row, col })) return;
      }
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const order = Array.from({ length: cols }, (_, i) => i);
      for (const col of event.key === "Home" ? order : order.reverse()) if (focus({ row: active.row, col })) return;
    }
  }

  // The box that takes Tab: the one last focused, or the start.
  const tabIndex = (cell: GridCell) => (cell.row === active.row && cell.col === active.col ? 0 : -1);

  return { ref, onKeyDown, tabIndex, setActive, focus };
}
