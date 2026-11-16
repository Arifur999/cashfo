"use client";

import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useId } from "react";
import { updateZakatPricesAction } from "@/app/(dashboardLayout)/admin/settings/_action";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import T from "@/components/shared/T";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ErrorState from "@/components/smartly/ErrorState";
import SkeletonRows from "@/components/smartly/SkeletonRows";
import { useActionMutation } from "@/hooks/useActionMutation";
import { formatDay } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { takaSign } from "@/lib/i18n/formatPrefs";
import { queryKeys } from "@/lib/queryKeys";
import { zakatPricesQuery } from "@/queries/zakat.queries";
import type { IZakatPrices } from "@/types/zakat.types";
import { zakatPricesFormZodSchema as schema, type IZakatPricesFormValues } from "@/zod/zakat.validation";

const toFormValues = (prices: IZakatPrices): IZakatPricesFormValues => ({ gold22: String(prices.gold22), silver22: String(prices.silver22), on: prices.on });

// "Zakat prices": the BAJUS prices per vori (22 karat gold and silver)
// every member's Zakat calculator starts from, and the day they are from.
// There is no official feed, so an admin enters them when BAJUS moves them;
// a member can still use their own in Zakat settings. Super and finance
// admins change them; every save goes to the audit log.
const ZakatPricesCard = ({ canManage }: { canManage: boolean }) => {
  const { translate } = useLocale();
  const titleId = useId();
  const query = useQuery(zakatPricesQuery());
  const prices = query.data?.data;

  return (
    <Card asChild padding="none" className="overflow-hidden">
      <section aria-labelledby={titleId}>
        <div className="flex flex-col gap-0.75 px-5 pt-4 pb-1">
          <h2 id={titleId} className="text-title text-ink">
            <T>Zakat prices</T>
          </h2>
          <p className="text-small leading-normal text-ink-soft">
            <T>{"BAJUS prices per vori. Every member's zakat starts from them; a member can still use their own in Zakat settings."}</T>
          </p>
        </div>
        {prices ? (
          // A new form when fresh prices arrive, so it starts from them.
          <PricesForm key={`${prices.gold22}-${prices.silver22}-${prices.on}`} prices={prices} canManage={canManage} />
        ) : !query.isError ? (
          <SkeletonRows rows={2} avatar={false} />
        ) : (
          <ErrorState title={translate("Couldn't load the zakat prices")} onRetry={() => void query.refetch()} />
        )}
      </section>
    </Card>
  );
};

const PricesForm = ({ prices, canManage }: { prices: IZakatPrices; canManage: boolean }) => {
  const { locale } = useLocale();
  const { run, isPending } = useActionMutation({
    action: updateZakatPricesAction,
    successMessage: "Zakat prices saved",
    invalidateKeys: [queryKeys.zakatPrices.all],
    refreshRoute: false,
  });
  const form = useForm({
    defaultValues: toFormValues(prices),
    onSubmit: async ({ value, formApi }) => {
      if (await run(value)) formApi.reset(value, { keepDefaultValues: true });
    },
  });
  const disabled = !canManage;
  const taka = <span className="font-semibold text-ink-soft">{takaSign(locale)}</span>;

  return (
    <AppForm onSubmit={form.handleSubmit} className="space-y-0">
      <div className="grid gap-4 px-5 pt-3 pb-5 sm:grid-cols-3">
        <form.Field name="gold22" validators={{ onChange: schema.shape.gold22 }}>
          {(field) => <AppField field={field} label="Gold, 22 karat" inputMode="numeric" prepend={taka} disabled={disabled} description="Per vori. 21, 18 karat and traditional follow it." />}
        </form.Field>
        <form.Field name="silver22" validators={{ onChange: schema.shape.silver22 }}>
          {(field) => <AppField field={field} label="Silver, 22 karat" inputMode="numeric" prepend={taka} disabled={disabled} description="Per vori. Sets the silver nisab." />}
        </form.Field>
        <form.Field name="on" validators={{ onChange: schema.shape.on }}>
          {(field) => <AppField field={field} label="Prices from" type="date" disabled={disabled} description="The day BAJUS set them." />}
        </form.Field>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-strip px-5 py-3 sm:flex-nowrap">
        <span className="min-w-0 flex-1 basis-60 text-[12.5px] text-ink-muted">
          <T values={{ date: formatDay(prices.on, "d MMM yyyy", locale) }}>{"Members see prices from {date}."}</T> <T>{canManage ? "Every save goes to the audit log." : "Only super and finance admins can change these."}</T>
        </span>
        {canManage && (
          <form.Subscribe selector={(state) => [state.isDirty, state.isSubmitting] as const}>
            {([isDirty, isSubmitting]) => (
              <span className="ml-auto flex shrink-0 gap-2">
                <Button variant="secondary" size="md" disabled={!isDirty || isSubmitting} onClick={() => form.reset()}>
                  <T>Discard</T>
                </Button>
                <AppSubmitButton isPending={isPending || isSubmitting} disabled={!isDirty} pendingLabel="Saving..." variant="action" size="md" className="w-auto">
                  <T>Save prices</T>
                </AppSubmitButton>
              </span>
            )}
          </form.Subscribe>
        )}
      </div>
    </AppForm>
  );
};

export default ZakatPricesCard;
