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

// The square outline button in the top bar, or the round one on the Night
// drawer.
export function ThemeToggle({ onDark = false }: { onDark?: boolean }) {
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
  const label = isDark ? t("Switch to light theme") : t("Switch to dark theme");
  const icon = mounted ? isDark ? <Sun className="size-4.5" /> : <Moon className="size-4.5" /> : <span className="block size-4.5" />;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={cn(
        "flex shrink-0 items-center justify-center transition-colors",
        onDark ? "size-9.5 rounded-full bg-white/8 text-white hover:bg-white/14" : "size-10 rounded-md border border-line bg-surface text-ink-2 hover:bg-surface-sunken",
      )}
    >
      {icon}
    </button>
  );
}
