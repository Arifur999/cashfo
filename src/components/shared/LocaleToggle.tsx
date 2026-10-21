"use client";

import { Languages } from "lucide-react";
import Button from "@/components/smartly/Button";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// Switches English and Bangla: the design's toolbar outline button.
const LocaleToggle = () => {
  const { locale, toggleLocale, translate } = useLocale();

  return (
    <Button variant="outline" size="sm" onClick={toggleLocale} aria-label={translate("Toggle language")}>
      <Languages aria-hidden="true" />
      {/* Each language names itself, so it's recognisable to its readers. */}
      <span lang={locale === "en" ? "bn" : "en"}>{locale === "en" ? "বাংলা" : "English"}</span>
    </Button>
  );
};

export default LocaleToggle;
