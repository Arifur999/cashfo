import type { ColumnDef } from "@tanstack/react-table";
import DateCell from "@/components/shared/cell/DateCell";
import EditableTextCell from "@/components/shared/cell/EditableTextCell";
import { formatDate } from "@/lib/date";
import type { ITranslation, TranslationLanguage } from "@/types/translation.types";
import { flagsOf } from "./translationFilters";

// Only there to facet on (the tabs); the Bangla column shows what is missing.
export const TRANSLATIONS_HIDDEN_COLUMNS = ["flags", "updatedAt"] as const;

export type SaveTranslationText = (translation: ITranslation, language: TranslationLanguage, value: string) => Promise<boolean>;

// The design's translations list: the key, the English, the Bangla in a box
// that asks for the words when there are none, and the area.
// saveText is null for roles that can only read.
export const buildTranslationsColumns = (saveText: SaveTranslationText | null): ColumnDef<ITranslation>[] => [
  {
    id: "key",
    accessorKey: "key",
    header: "Key",
    cell: ({ row }) => <code className="block truncate font-mono text-small text-ink-2">{row.original.key}</code>,
    meta: { cellClassName: "max-w-60" },
  },
  {
    id: "en",
    accessorKey: "en",
    header: "English",
    cell: ({ row }) => (
      <EditableTextCell
        value={row.original.en}
        label={`English text of ${row.original.key}`}
        readOnly={saveText === null}
        onSave={(value) => saveText?.(row.original, "en", value) ?? Promise.resolve(false)}
      />
    ),
  },
  {
    id: "bn",
    accessorKey: "bn",
    header: "বাংলা",
    cell: ({ row }) => (
      <EditableTextCell
        value={row.original.bn}
        label={`Bangla text of ${row.original.key}`}
        placeholder="Add the Bangla words"
        tone={row.original.bn.trim() ? "box" : "missing"}
        lang="bn"
        readOnly={saveText === null}
        onSave={(value) => saveText?.(row.original, "bn", value) ?? Promise.resolve(false)}
      />
    ),
  },
  {
    id: "context",
    accessorFn: (row) => row.context ?? "",
    header: "Area",
    cell: ({ row }) => <span className="text-small text-ink-muted">{row.original.context ?? "—"}</span>,
  },
  {
    id: "flags",
    accessorFn: flagsOf,
    header: "Needs",
    enableSorting: false,
  },
  {
    id: "updatedAt",
    accessorKey: "updatedAt",
    header: "Updated",
    cell: ({ row }) => <DateCell date={row.original.updatedAt} />,
    meta: { exportValue: (row) => formatDate(row.updatedAt) },
  },
];
