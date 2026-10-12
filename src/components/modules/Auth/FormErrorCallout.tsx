"use client";

import Callout from "@/components/shared/Callout";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// The message an action came back with, in the active language when the
// dictionary knows it (backend messages are English keys too).
const FormErrorCallout = ({ message }: { message: string | null }) => {
  const { translate } = useLocale();

  if (!message) {
    return null;
  }
  return (
    <Callout variant="danger" role="alert">
      {translate(message)}
    </Callout>
  );
};

export default FormErrorCallout;
