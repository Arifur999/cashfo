"use client";

import { Briefcase, CircleCheckBig, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { ICustomerWorkspace } from "@/types/customer.types";

interface CustomerWelcomeProps {
  name: string;
  workspaces: ICustomerWorkspace[];
}

// The customer home until the money-management screens move into this app:
// the account works, here is the workspace it made, more is coming here.
const CustomerWelcome = ({ name, workspaces }: CustomerWelcomeProps) => {
  const { translate } = useLocale();

  return (
    <div className="space-y-8">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {translate("Hi,")} {name}
        </h1>
        <p className="text-muted-foreground">{translate("Your account is ready.")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-sm shadow-black/5">
          <CardContent className="space-y-4">
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-dark">
              <CircleCheckBig className="size-5" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <h2 className="font-semibold text-foreground">{translate("Your workspace")}</h2>
              <p className="text-sm text-muted-foreground">{translate("Every account and transaction lives in a workspace.")}</p>
            </div>
            <ul className="space-y-2">
              {workspaces.map((workspace) => (
                <li key={workspace.id} className="flex items-center gap-2.5 rounded-lg bg-muted/60 px-3 py-2 text-sm">
                  <Briefcase className="size-4 text-muted-foreground" aria-hidden="true" />
                  <span className="truncate font-medium text-foreground">{workspace.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{workspace.currency}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="shadow-sm shadow-black/5">
          <CardContent className="space-y-4">
            <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700">
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <h2 className="font-semibold text-foreground">{translate("Your money dashboard is on its way")}</h2>
              <p className="text-sm text-muted-foreground">
                {translate("Accounts, transactions, budgets and reports will open right here. We'll have them ready soon.")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CustomerWelcome;
