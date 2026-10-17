"use client";

import { Plus } from "lucide-react";
import Button, { type ButtonProps } from "@/components/smartly/Button";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// The design's create button in a page header: forest, a plus, then the
// words ("New coupon"). Works as a drawer's or dialog's trigger.
const CreateButton = ({ children, ...props }: Omit<ButtonProps, "children"> & { children: string }) => {
  const { translate } = useLocale();
  return (
    <Button {...props}>
      <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
      {translate(children)}
    </Button>
  );
};

export default CreateButton;
