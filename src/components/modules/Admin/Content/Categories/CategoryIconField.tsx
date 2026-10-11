"use client";

import type { AnyFieldApi } from "@tanstack/react-form";
import { Grid3x3 } from "lucide-react";
import { useState } from "react";
import FormFieldShell from "@/components/shared/form/FormFieldShell";
import IconPreview from "@/components/shared/IconPreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CATEGORY_ICON_NAMES } from "@/lib/categoryIcons";
import { cn } from "@/lib/utils";

// The icon name as text (the apps may know icons the panel doesn't), with a
// live preview and a picker for the icons the panel can show.
const CategoryIconField = ({ field, label }: { field: AnyFieldApi; label: string }) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const value: string = field.state.value ?? "";

  return (
    <FormFieldShell field={field} label={label} description="Pick one, or type a name the app knows.">
      {(control, hasError) => (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-foreground">
              <IconPreview name={value} />
            </span>
            <Input
              {...control}
              name={field.name}
              value={value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="e.g. shopping-cart"
              autoComplete="off"
              className={cn("pl-10", hasError && "border-destructive focus-visible:ring-destructive/20")}
            />
          </div>
          <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen} modal>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="icon" aria-label="Choose an icon">
                <Grid3x3 aria-hidden="true" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-2">
              <div role="listbox" aria-label="Icons" className="grid max-h-64 grid-cols-6 gap-1 overflow-y-auto">
                {CATEGORY_ICON_NAMES.map((name) => (
                  <button
                    key={name}
                    type="button"
                    role="option"
                    aria-selected={name === value}
                    aria-label={name}
                    title={name}
                    onClick={() => {
                      field.handleChange(name);
                      field.handleBlur();
                      setIsPickerOpen(false);
                    }}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-lg text-foreground hover:bg-muted",
                      name === value && "bg-primary/15 ring-1 ring-primary",
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
