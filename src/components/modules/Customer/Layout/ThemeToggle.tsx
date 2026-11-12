"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useTheme } from "@/components/modules/Customer/Providers/ThemeProvider";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

// The server always renders assuming "light" (it has no access to
// localStorage/prefers-color-scheme), while the client's real value is set
// synchronously by the inline script in the root layout before hydration
// runs. useSyncExternalStore's getServerSnapshot/getSnapshot split forces
// one extra render right after mount without a setState in an effect, so
// Sun vs Moon never mismatches during hydration.
const subscribe = () => () => {};

// The moon / sun button. Its shape comes from where it sits (the top bar's
// pill or square, the phone drawer's foot).
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLocale();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  // Everything here must match the server's assumption (always "light")
  // until `mounted` flips -- the label too, since it's derived from the
  // real (client-only) theme.
  const isDark = mounted && theme === "dark";
  const label = isDark ? t("Switch to light mode") : t("Switch to dark mode");
  const icon = mounted ? isDark ? <Sun className="size-4.5" strokeWidth={2} /> : <Moon className="size-4.5" strokeWidth={2} /> : <span className="block size-4.5" />;

  return (
    <button type="button" onClick={toggleTheme} aria-pressed={isDark} aria-label={label} title={label} className={cn("flex shrink-0 items-center justify-center text-ink-soft transition-colors hover:text-ink", className)}>
      {icon}
    </button>
  );
}
