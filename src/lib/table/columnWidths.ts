// The design's grid in a DataTable, as DataTableContent lays it out. Plain
// and unit-tested.

// One column of the grid: its track (meta.width, or undefined for the column
// that takes what is left) and the padding its cell adds on either side.
export interface GridColumn {
  track?: number;
  padding: number;
}

// How narrow a table whose columns keep their px (layout.flexMinWidth) gets
// before it scrolls sideways: every column's track and padding, flexMin for
// each column without a track, and never under floor.
export const keptTableWidth = (columns: readonly GridColumn[], flexMin: number, floor: number): number =>
  Math.max(
    floor,
    columns.reduce((sum, { track, padding }) => sum + (track ?? flexMin) + padding, 0),
  );
