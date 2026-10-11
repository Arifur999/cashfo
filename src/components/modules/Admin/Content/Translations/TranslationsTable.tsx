"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { updateTranslationTextAction } from "@/app/(dashboardLayout)/admin/content/translations/_action";
import DataTable from "@/components/shared/table/DataTable";
import { useActionMutation } from "@/hooks/useActionMutation";
import { queryKeys } from "@/lib/queryKeys";
import { translationsQuery } from "@/queries/translation.queries";
import type { ITranslation, TranslationLanguage } from "@/types/translation.types";
import CreateTranslationDialog from "./CreateTranslationDialog";
import ExportTranslationsMenu from "./ExportTranslationsMenu";
import { buildTranslationFilters } from "./translationFilters";
import { buildTranslationsColumns, TRANSLATIONS_HIDDEN_COLUMNS } from "./translationsColumns";

interface SaveTextVariables {
  translation: ITranslation;
  language: TranslationLanguage;
  value: string;
}

// Every UI string, edited in place: click a cell, type, press Enter.
const TranslationsTable = ({ canManage }: { canManage: boolean }) => {
  const { data, isLoading, isFetching } = useQuery(translationsQuery());
  const translations = useMemo(() => data?.data ?? [], [data]);
  const filters = useMemo(() => buildTranslationFilters(translations), [translations]);

  const { run } = useActionMutation({
    action: ({ translation, language, value }: SaveTextVariables) => updateTranslationTextAction(translation.id, { language, value }),
    successMessage: (updated) => `Saved ${updated.key}`,
    invalidateKeys: [queryKeys.translations.all],
    refreshRoute: false,
  });
  // Stable (run is), so the columns -- and the cells being edited -- survive re-renders.
  const saveText = useCallback(
    (translation: ITranslation, language: TranslationLanguage, value: string) => run({ translation, language, value }),
    [run],
  );
  const columns = useMemo(() => buildTranslationsColumns(canManage ? saveText : null), [canManage, saveText]);

  return (
    <DataTable
      data={data?.data}
      columns={columns}
      getRowId={(row) => row.id}
      tableId="translations"
      defaultHiddenColumns={TRANSLATIONS_HIDDEN_COLUMNS}
      initialPageSize={25}
      isLoading={isLoading}
      isFetching={isFetching}
      search={{ placeholder: "Search keys or text..." }}
      filters={{ configs: filters }}
      exportFileName="translations"
      toolbarAction={
        <>
          <ExportTranslationsMenu />
          {canManage && <CreateTranslationDialog />}
        </>
      }
      emptyMessage="No strings match these filters."
    />
  );
};

export default TranslationsTable;
