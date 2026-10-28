"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { updateTranslationTextAction } from "@/app/(dashboardLayout)/admin/content/translations/_action";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import DataTable from "@/components/shared/table/DataTable";
import { useActionMutation } from "@/hooks/useActionMutation";
import { queryKeys } from "@/lib/queryKeys";
import { translationsQuery } from "@/queries/translation.queries";
import type { ITranslation, TranslationLanguage } from "@/types/translation.types";
import { buildTranslationFilters } from "./translationFilters";
import { buildTranslationsColumns, TRANSLATIONS_HIDDEN_COLUMNS } from "./translationsColumns";
import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface SaveTextVariables {
  translation: ITranslation;
  language: TranslationLanguage;
  value: string;
}

// A new English wording waiting on its confirmation; the cell keeps showing
// it until resolve says whether it was saved.
interface PendingEnglish extends Omit<SaveTextVariables, "language"> {
  resolve: (saved: boolean) => void;
}

// Every UI string, edited in place: click a cell, type, press Enter. The
// tabs single out what is missing Bangla or changed this week.
const TranslationsTable = ({ canManage }: { canManage: boolean }) => {
  const query = useQuery(translationsQuery());
  const { data, isLoading, isFetching } = query;
  const translations = useMemo(() => data?.data ?? [], [data]);
  const filters = useMemo(() => buildTranslationFilters(translations), [translations]);
  const { translate } = useLocale();
  const [pendingEnglish, setPendingEnglish] = useState<PendingEnglish | null>(null);

  const { run, isPending } = useActionMutation({
    action: ({ translation, language, value }: SaveTextVariables) => updateTranslationTextAction(translation.id, { language, value }),
    successMessage: (updated) => translate("Saved {key}", { key: updated.key }),
    invalidateKeys: [queryKeys.translations.all],
    refreshRoute: false,
  });
  // Stable (run is), so the columns -- and the cells being edited -- survive
  // re-renders. The app finds a Bangla by its English wording, so a new
  // English wording is confirmed first: it moves the Bangla onto other text.
  // The cell saves inside a transition, which holds its state updates until
  // the save settles; the question is asked from outside it (a microtask),
  // or it would wait for the very answer it asks for.
  const saveText = useCallback(
    (translation: ITranslation, language: TranslationLanguage, value: string) =>
      language === "en"
        ? new Promise<boolean>((resolve) => {
            queueMicrotask(() => setPendingEnglish({ translation, value, resolve }));
          })
        : run({ translation, language, value }),
    [run],
  );
  const columns = useMemo(() => buildTranslationsColumns(canManage ? saveText : null), [canManage, saveText]);

  const settleEnglish = (saved: boolean) => {
    pendingEnglish?.resolve(saved);
    setPendingEnglish(null);
  };

  return (
    <>
      <DataTable
        data={data?.data}
        columns={columns}
        layout={{ gap: 16, rowHeight: 52 }}
        getRowId={(row) => row.id}
        defaultHiddenColumns={TRANSLATIONS_HIDDEN_COLUMNS}
        initialPageSize={25}
        isLoading={isLoading}
        isFetching={isFetching}
        // An outage isn't "no strings": the table says they didn't load,
        // with Try again, while its tabs and search stay to hand.
        isError={query.isError}
        onRetry={() => void query.refetch()}
        errorTitle="Couldn't load the translations"
        errorDescription="Try again in a moment."
        search={{ placeholder: "Search a key or a word", width: "sm" }}
        filters={{ configs: filters }}
        footer={
          <T values={{ example: "{{name}}" }}>
            {"Changes go live in the app within a minute. Keep placeholders like {example} the same in both languages."}
          </T>
        }
        emptyMessage="No strings match."
      />
      <ConfirmDialog
        open={pendingEnglish !== null}
        onOpenChange={(open) => {
          if (!open) settleEnglish(false);
        }}
        title="Change the English wording?"
        description={
          pendingEnglish
            ? translate("The app finds this Bangla by its English wording. After this change it replaces “{new}” instead of “{old}”.", {
                new: pendingEnglish.value,
                old: pendingEnglish.translation.en,
              })
            : ""
        }
        confirmLabel="Change the English"
        pendingLabel="Saving..."
        isPending={isPending}
        onConfirm={async () => {
          if (!pendingEnglish) return;
          settleEnglish(await run({ translation: pendingEnglish.translation, language: "en", value: pendingEnglish.value }));
        }}
      />
    </>
  );
};

export default TranslationsTable;
