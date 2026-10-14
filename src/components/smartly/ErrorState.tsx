"use client";

import { RefreshCw, WifiOff } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import Button from "./Button";
import StatePanel from "./StatePanel";

interface ErrorStateProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  // Shows a "Try again" button that calls it.
  onRetry?: () => void;
  bordered?: boolean;
  className?: string;
}

// Could not load: says what failed, that nothing was lost, and offers a
// retry.
const ErrorState = ({ title, description, onRetry, bordered, className }: ErrorStateProps) => {
  const { t } = useLocale();
  return (
    <StatePanel
      icon={<WifiOff />}
      tone="warning"
      title={title}
      description={description ?? t("Check your internet and try again. Nothing was lost.")}
      action={
        onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            <RefreshCw />
            {t("Try again")}
          </Button>
        )
      }
      bordered={bordered}
      className={className}
    />
  );
};

export default ErrorState;
