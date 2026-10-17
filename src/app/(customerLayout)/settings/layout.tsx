import { SettingsShell } from "@/components/modules/Customer/Settings/SettingsShell";

// Every Settings page shares the heading and the rail on the left.
export default function SettingsLayout({ children }: LayoutProps<"/settings">) {
  return <SettingsShell>{children}</SettingsShell>;
}
