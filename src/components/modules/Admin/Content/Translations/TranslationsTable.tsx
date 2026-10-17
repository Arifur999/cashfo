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
import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface SaveTextVariables {
  translation: ITranslation;
  language: TranslationLanguage;
  value: string;
}

// Every UI string, edited in place: click a cell, type, press Enter. The
// tabs single out what is missing Bangla or changed this week.
const TranslationsTable = ({ canManage }: { canManage: boolean }) => {
  const { data, isLoading, isFetching } = useQuery(translationsQuery());
  const translations = useMemo(() => data?.data ?? [], [data]);
  const filters = useMemo(() => buildTranslationFilters(translations), [translations]);
  const { translate } = useLocale();

  const { run } = useActionMutation({
    action: ({ translation, language, value }: SaveTextVariables) => updateTranslationTextAction(translation.id, { language, value }),
    successMessage: (updated) => translate("Saved {key}", { key: updated.key }),
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
      search={{ placeholder: "Search a key or a word", width: "sm" }}
      filters={{ configs: filters }}
      exportFileName="translations"
      toolbarAction={
        <>
          <ExportTranslationsMenu />
          {canManage && <CreateTranslationDialog />}
        </>
      }
      footer={
        <T values={{ example: "{{name}}" }}>{"Changes go live in the app within a minute. Keep placeholders like {example} the same in both languages."}</T>
      }
      emptyMessage="No strings match."
    />
  );
};

export default TranslationsTable;
