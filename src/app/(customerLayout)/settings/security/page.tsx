import { SecuritySection } from "@/components/modules/Customer/Settings/SecuritySection";
import { getLoginHistoryAction, getSessionsAction } from "@/lib/customer/authActions";
import { customerPageMetadata } from "@/lib/customer/pageTitle";

export const generateMetadata = () => customerPageMetadata("/settings/security");

// The devices and the sign-in history are read here so the page arrives
// filled in. A read that fails is passed as null, so its card says it
// couldn't load (with Try again) instead of "no devices", which this very
// device would prove wrong.
export default async function SettingsSecurityPage() {
  const [sessions, history] = await Promise.all([getSessionsAction(), getLoginHistoryAction()]);
  return <SecuritySection initialSessions={sessions.success ? (sessions.data ?? []) : null} initialHistory={history.success ? (history.data ?? []) : null} />;
}
