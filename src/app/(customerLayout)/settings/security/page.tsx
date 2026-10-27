import { SecuritySection } from "@/components/modules/Customer/Settings/SecuritySection";
import { getLoginHistoryAction, getSessionsAction } from "@/lib/customer/authActions";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getSecurityAlertsAction, getTwoStepStatusAction } from "@/lib/customer/securityActions";

export const generateMetadata = () => customerPageMetadata("/settings/security");

// The devices, the sign-in history, two-step sign-in and the alerts are read
// here so the page arrives filled in. A read that fails is passed as null,
// so its card says it couldn't load (with Try again) instead of "no
// devices", which this very device would prove wrong.
export default async function SettingsSecurityPage() {
  const [sessions, history, twoStep, alerts] = await Promise.all([getSessionsAction(), getLoginHistoryAction(), getTwoStepStatusAction(), getSecurityAlertsAction()]);
  return (
    <SecuritySection
      initialSessions={sessions.success ? (sessions.data ?? []) : null}
      initialHistory={history.success ? (history.data ?? []) : null}
      initialTwoStep={twoStep.success ? (twoStep.data ?? null) : null}
      initialAlerts={alerts.success ? (alerts.data ?? null) : null}
    />
  );
}
