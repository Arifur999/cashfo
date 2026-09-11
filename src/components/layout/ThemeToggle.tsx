"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useTheme } from "@/components/providers/ThemeProvider";

// The server always renders assuming "light" (it has no access to
// localStorage/prefers-color-scheme), while the client's real value is set
// synchronously by the inline script in the root layout before hydration
// runs. suppressHydrationWarning does NOT cover this -- it only silences a
// mismatched text node, not a whole differing element (Sun vs Moon is a
// different component/DOM subtree entirely). useSyncExternalStore's
// getServerSnapshot/getSnapshot split is React's own dedicated tool for
// exactly this "value that's only known once hydrated" problem: it forces
// one extra render right after mount without ever calling setState inside
// an effect (same approach next-themes uses internally, just via a
// different mechanism than its useEffect-based one).
const subscribe = () => () => {};

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  // Everything rendered here must match the server's assumption (always
  // "light") until `mounted` flips -- not just the icon, the title text
  // too, since that's equally derived from the real (client-only) theme.
  const isDark = mounted && theme === "dark";
  const icon = mounted ? (isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />) : <span className="block h-4 w-4" />;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded-xl p-2 text-neutral-500 hover:bg-neutral-100"
    >
      {icon}
    </button>
  );
}
