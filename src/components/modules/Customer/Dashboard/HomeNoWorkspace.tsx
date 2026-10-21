"use client";

import { LayoutGrid, Plus, Settings, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CreateWorkspaceModal } from "@/components/modules/Customer/Workspace/CreateWorkspaceModal";
import Button from "@/components/smartly/Button";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import StatePanel from "@/components/smartly/StatePanel";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface HomeNoWorkspaceProps {
  greeting: "Good morning" | "Good afternoon" | "Good evening";
  firstName: string;
  // "Friday, 2 October", for the eyebrow.
  day: string;
  // A member of a group (a mess or family book), which opens from Group
  // expenses rather than being switched into.
  hasGroup: boolean;
}

// A label too long for a phone's row (the longer Bangla, say) wraps onto
// another line rather than pushing the page sideways.
const FITS = "h-auto min-h-10 max-w-full py-1.5 whitespace-normal";

// Home for an account with no personal or business workspace to open: only
// groups, or its own was removed. Every page sends such a customer here, so
// this says what they can do: open their group's expenses, or make a
// workspace (the same dialog as Settings › Workspaces), or manage them there.
export function HomeNoWorkspace({ greeting, firstName, day, hasGroup }: HomeNoWorkspaceProps) {
  const { t } = useLocale();
  const [creating, setCreating] = useState(false);

  return (
    <PageFrame gap="lg">
      <PageHeader size="display" eyebrow={day} title={`${t(greeting)}, ${firstName}`} />
      <StatePanel
        icon={<LayoutGrid />}
        tone="neutral"
        title={t("No workspace to open yet")}
        description={
          hasGroup
            ? t("Your money, budgets and goals live in a workspace. Open your group's expenses, or create a workspace of your own.")
            : t("Your money, budgets and goals live in a workspace. Create one to start.")
        }
        className="py-12"
        action={
          <>
            {hasGroup && (
              <Button asChild className={FITS}>
                <Link href="/group-expenses">
                  <Users aria-hidden="true" />
                  {t("Open Group expenses")}
                </Link>
              </Button>
            )}
            <Button variant={hasGroup ? "secondary" : "primary"} onClick={() => setCreating(true)} className={FITS}>
              <Plus aria-hidden="true" />
              {t("Create a business workspace")}
            </Button>
            <Button asChild variant="ghost" className={FITS}>
              <Link href="/settings/workspaces">
                <Settings aria-hidden="true" />
                {t("Manage workspaces")}
              </Link>
            </Button>
          </>
        }
      />
      {/* Once it exists, the refresh opens Home in it: it is then the only
          workspace there is to open. */}
      <CreateWorkspaceModal open={creating} onClose={() => setCreating(false)} />
    </PageFrame>
  );
}
