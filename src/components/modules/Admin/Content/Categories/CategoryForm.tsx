"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { createCategoryAction, updateCategoryAction } from "@/app/(dashboardLayout)/admin/content/categories/_action";
import FormDialogFooter from "@/components/shared/dialog/FormDialogFooter";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppSelectField from "@/components/shared/form/AppSelectField";
import { useActionMutation } from "@/hooks/useActionMutation";
import { queryKeys } from "@/lib/queryKeys";
import { accountTemplatesQuery } from "@/queries/accountTemplate.queries";
import type { ICategory } from "@/types/category.types";
import { categoryFormZodSchema, type ICategoryFormValues } from "@/zod/category.validation";
import CategoryIconField from "./CategoryIconField";
import { buildLinkedAccountOptions, CATEGORY_DIRECTION_OPTIONS } from "./categoryOptions";

const { shape } = categoryFormZodSchema;

interface CategoryFormProps {
  defaultValues: ICategoryFormValues;
  // Editing this category; absent means creating one.
  category?: ICategory;
  onDone: () => void;
}

// Mounted inside the dialog content, so each open starts from defaultValues.
const CategoryForm = ({ defaultValues, category, onDone }: CategoryFormProps) => {
  const { data: templatesResponse } = useQuery(accountTemplatesQuery());

  const { run, isPending } = useActionMutation({
    action: (values: ICategoryFormValues) => (category ? updateCategoryAction(category.id, values) : createCategoryAction(values)),
    successMessage: category ? "Category updated" : "Category created",
    invalidateKeys: [queryKeys.categories.all],
    refreshRoute: false,
  });

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      if (await run(value)) {
        onDone();
      }
    },
  });

  // The account list re-orders when the direction changes.
  const direction = useStore(form.store, (state) => state.values.type);
  const accountOptions = useMemo(
    () => buildLinkedAccountOptions(templatesResponse?.data ?? [], direction, category?.linkedAccountTemplateId),
    [templatesResponse, direction, category?.linkedAccountTemplateId],
  );

  return (
    <AppForm onSubmit={form.handleSubmit}>
      <div className="grid gap-5 sm:grid-cols-2">
        <form.Field name="name" validators={{ onChange: shape.name }}>
          {(field) => <AppField field={field} label="Name (English)" placeholder="e.g. Groceries" />}
        </form.Field>
        <form.Field name="nameBn" validators={{ onChange: shape.nameBn }}>
          {(field) => <AppField field={field} label="Name (Bangla)" placeholder="e.g. মুদি" />}
        </form.Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <form.Field name="type" validators={{ onChange: shape.type }}>
          {(field) => <AppSelectField field={field} label="Type" options={CATEGORY_DIRECTION_OPTIONS} />}
        </form.Field>
        <form.Field name="icon" validators={{ onChange: shape.icon }}>
          {(field) => <CategoryIconField field={field} label="Icon" />}
        </form.Field>
      </div>
      <form.Field name="linkedAccountTemplateId" validators={{ onChange: shape.linkedAccountTemplateId }}>
        {(field) => (
          <AppSelectField
            field={field}
            label="Linked account"
            options={accountOptions}
            description="The default account entries in this category post to."
          />
        )}
      </form.Field>
      <form.Field name="displayOrder" validators={{ onChange: shape.displayOrder }}>
        {(field) => <AppField field={field} label="Display order" type="number" description="Lower numbers are listed first." />}
      </form.Field>
      <FormDialogFooter isPending={isPending} submitLabel={category ? "Save changes" : "Create category"} pendingLabel="Saving..." />
    </AppForm>
  );
};

export default CategoryForm;
