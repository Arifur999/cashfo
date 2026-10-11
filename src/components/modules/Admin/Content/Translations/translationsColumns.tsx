import type { ColumnDef } from "@tanstack/react-table";
import DateCell from "@/components/shared/cell/DateCell";
import EditableTextCell from "@/components/shared/cell/EditableTextCell";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/date";
import type { ITranslation, TranslationLanguage } from "@/types/translation.types";
import { banglaStatusOf } from "./translationFilters";

// Only there to facet on (Translated / Missing); the Bangla column shows it.
export const TRANSLATIONS_HIDDEN_COLUMNS = ["banglaStatus"] as const;

export type SaveTranslationText = (translation: ITranslation, language: TranslationLanguage, value: string) => Promise<boolean>;

const textColumn = (
  language: TranslationLanguage,
  header: string,
  saveText: SaveTranslationText | null,
): ColumnDef<ITranslation> => ({
  id: language,
  accessorKey: language,
  header,
  cell: ({ row }) => (
    <EditableTextCell
      value={row.original[language]}
      label={`${header} text of ${row.original.key}`}
      placeholder={language === "bn" ? "Not translated yet" : "—"}
      readOnly={saveText === null}
      onSave={(value) => saveText?.(row.original, language, value) ?? Promise.resolve(false)}
    />
  ),
});

// saveText is null for roles that can only read.
export const buildTranslationsColumns = (saveText: SaveTranslationText | null): ColumnDef<ITranslation>[] => [
  {
    id: "key",
    accessorKey: "key",
    header: "Key",
    cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.key}</span>,
  },
  {
    id: "context",
    accessorFn: (row) => row.context ?? "",
    header: "Context",
    cell: ({ row }) => (row.original.context ? <Badge variant="outline">{row.original.context}</Badge> : <span className="text-muted-foreground">—</span>),
  },
  textColumn("en", "English", saveText),
  textColumn("bn", "Bangla", saveText),
  {
    id: "banglaStatus",
    accessorFn: banglaStatusOf,
    header: "Bangla Status",
  },
  {
    id: "updatedAt",
    accessorKey: "updatedAt",
    header: "Updated",
    cell: ({ row }) => <DateCell date={row.original.updatedAt} />,
    meta: { exportValue: (row) => formatDate(row.updatedAt) },
  },
];
