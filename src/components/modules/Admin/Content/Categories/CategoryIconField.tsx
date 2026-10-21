"use client";

import type { AnyFieldApi } from "@tanstack/react-form";
import { Grid3x3 } from "lucide-react";
import { useState } from "react";
import FormFieldShell from "@/components/shared/form/FormFieldShell";
import IconPreview from "@/components/shared/IconPreview";
import Button from "@/components/smartly/Button";
import Input from "@/components/smartly/form/Input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CATEGORY_ICON_NAMES } from "@/lib/categoryIcons";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

// The icon name as text (the apps may know icons the panel doesn't), with a
// live preview and a picker for the icons the panel can show. The field is
// the form's 44px frame; the picker is a grid of buttons, the chosen one
// pressed.
const CategoryIconField = ({ field, label }: { field: AnyFieldApi; label: string }) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const { translate } = useLocale();
  const value: string = field.state.value ?? "";

  return (
    <FormFieldShell field={field} label={label} description="Pick one, or type a name the app knows.">
      {(control, hasError) => (
        <div className="flex gap-2">
          <Input
            {...control}
            name={field.name}
            size="md"
            invalid={hasError}
            leading={<IconPreview name={value} />}
            value={value}
            onBlur={field.handleBlur}
            onChange={(event) => field.handleChange(event.target.value)}
            placeholder={translate("e.g. shopping-cart")}
            autoComplete="off"
            frameClassName="min-w-0 flex-1"
          />
          <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen} modal>
            <PopoverTrigger asChild>
              <Button variant="secondary" size="icon-lg" aria-label={translate("Choose an icon")}>
                <Grid3x3 aria-hidden="true" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-2">
              <div role="group" aria-label={translate("Icons")} className="grid max-h-64 grid-cols-6 gap-1 overflow-y-auto">
                {CATEGORY_ICON_NAMES.map((name) => (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={name === value}
                    aria-label={name}
                    title={name}
                    onClick={() => {
                      field.handleChange(name);
                      field.handleBlur();
                      setIsPickerOpen(false);
                    }}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-md text-ink transition-colors hover:bg-surface-sunken",
                      name === value && "bg-mint-50 ring-1 ring-emerald hover:bg-mint-50",
                    )}
                  >
                    <IconPreview name={name} className="size-5" />
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </FormFieldShell>
  );
};

export default CategoryIconField;
