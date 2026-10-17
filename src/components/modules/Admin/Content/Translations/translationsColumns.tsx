import type { ColumnDef } from "@tanstack/react-table";
import DateCell from "@/components/shared/cell/DateCell";
import EditableTextCell from "@/components/shared/cell/EditableTextCell";
import { formatDate } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { ITranslation, TranslationLanguage } from "@/types/translation.types";
import { flagsOf } from "./translationFilters";

// A text cell whose screen-reader name says which key and language it is.
const TextCell = ({ translation, language, saveText }: { translation: ITranslation; language: TranslationLanguage; saveText: SaveTranslationText | null }) => {
  const { translate } = useLocale();
  const bangla = language === "bn";
  return (
    <EditableTextCell
      value={translation[language]}
      label={translate(bangla ? "Bangla text of {key}" : "English text of {key}", { key: translation.key })}
      placeholder={bangla ? "Add the Bangla words" : undefined}
      tone={bangla ? (translation.bn.trim() ? "box" : "missing") : undefined}
      lang={bangla ? "bn" : undefined}
      readOnly={saveText === null}
      onSave={(value) => saveText?.(translation, language, value) ?? Promise.resolve(false)}
    />
  );
};

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
    meta: { width: 230 },
  },
  {
    id: "en",
    accessorKey: "en",
    header: "English",
    cell: ({ row }) => <TextCell translation={row.original} language="en" saveText={saveText} />,
  },
  {
    id: "bn",
    accessorKey: "bn",
    header: "বাংলা",
    cell: ({ row }) => <TextCell translation={row.original} language="bn" saveText={saveText} />,
  },
  {
    id: "context",
    accessorFn: (row) => row.context ?? "",
    header: "Area",
    cell: ({ row }) => <span className="text-small text-ink-muted">{row.original.context ?? "—"}</span>,
    meta: { width: 110 },
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
