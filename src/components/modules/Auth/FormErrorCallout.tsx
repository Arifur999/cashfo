"use client";

import { CircleAlert } from "lucide-react";
import Banner from "@/components/smartly/Banner";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// The message an action came back with, in the active language when the
// dictionary knows it (backend messages are English keys too).
const FormErrorCallout = ({ message }: { message: string | null }) => {
  const { translate } = useLocale();

  if (!message) {
    return null;
  }
  return (
    <Banner tone="danger" inline role="alert" icon={<CircleAlert />} className="font-medium">
      {translate(message)}
    </Banner>
  );
};

export default FormErrorCallout;
