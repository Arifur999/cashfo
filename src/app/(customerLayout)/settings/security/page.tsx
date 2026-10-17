import { SecuritySection } from "@/components/modules/Customer/Settings/SecuritySection";
import { getLoginHistoryAction, getSessionsAction } from "@/lib/customer/authActions";

// The devices and the sign-in history are read here so the page arrives
// filled in.
export default async function SettingsSecurityPage() {
  const [sessions, history] = await Promise.all([getSessionsAction(), getLoginHistoryAction()]);
  return <SecuritySection initialSessions={sessions.success && sessions.data ? sessions.data : []} initialHistory={history.success && history.data ? history.data : []} />;
}
