"use client";

import { ArrowLeftRight, Plus } from "lucide-react";
import { useAddActions } from "@/components/modules/Customer/Layout/AddActionsProvider";
import { useFeature } from "@/components/modules/Customer/Providers/PlatformProvider";
import Button from "@/components/smartly/Button";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { AddActionKey } from "@/lib/customer/addActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { HomeHabits } from "./HomeHabits";
import { HomeHero } from "./HomeHero";
import { HomeLoans } from "./HomeLoans";
import { HomeMoney } from "./HomeMoney";
import { HomeSetup, HomeSetupMore } from "./HomeSetup";
import type { HomeData } from "./homeTypes";
import { HomeVaultInsights } from "./HomeVaultInsights";

// Home: one section per feature -- this month on the hero, money, loans,
// habits, the vault and the insights. A new account gets the setup steps in
// place of the money part only: its habits, the vault and any loans already
// kept show as they always do. Phones get the board's shorter version of
// each section (HomePhone) and the floating button instead of the header's
// actions.
export function HomePageClient({ data }: { data: HomeData }) {
  const { t } = useLocale();
  // The shell's own Add actions: one transaction drawer, however it opens.
  const { actions, run } = useAddActions();
  const loansOn = useFeature("loan_management");
  const hasLoans = (data.loans?.rows.length ?? 0) > 0;
  const loansFailed = data.unavailable.includes("loans");
  const showLoans = loansOn && (data.loans !== null || loansFailed);

  const add = (key: AddActionKey) => {
    const action = actions.find((candidate) => candidate.key === key);
    if (action) run(action);
  };

  // Only an owner or accountant can post (the API refuses anyone else), so
  // only they get the buttons.
  const headerActions =
    data.canManage && !data.setup ? (
      <>
        <Button variant="secondary" size="lg" onClick={() => add("transfer")}>
          <ArrowLeftRight />
          {t("Transfer")}
        </Button>
        <Button size="lg" onClick={() => add("expense")}>
          <Plus strokeWidth={2.25} />
          {t("Add transaction")}
        </Button>
      </>
    ) : undefined;

  return (
    <PageFrame gap="lg">
      <PageHeader
        size="display"
        eyebrow={
          data.setup ? (
            t("Welcome to Smartly")
          ) : (
            <>
              {data.dates.day}
              <span className="hidden md:inline"> · {data.dates.hijri}</span>
            </>
          )
        }
        title={`${t(data.greeting)}, ${data.firstName}`}
        description={data.setup ? t("Three quick steps and Home fills itself in.") : t("Here is your day at a glance.")}
        actions={headerActions}
        hideActionsOnPhone
      />

      {data.setup ? (
        <>
          <HomeSetup data={data} onAddTransaction={() => add("expense")} />
          {/* A loans read that failed shows its own error card, never the
              invitation to add a first person. */}
          {showLoans && (hasLoans || loansFailed) && <HomeLoans data={data} />}
          <HomeHabits data={data} />
          <HomeVaultInsights data={data} />
          <HomeSetupMore showLoans={!hasLoans && !loansFailed} canManage={data.canManage} />
        </>
      ) : (
        <>
          <HomeHero data={data} />
          <HomeMoney data={data} />
          {showLoans && <HomeLoans data={data} />}
          <HomeHabits data={data} />
          <HomeVaultInsights data={data} />
        </>
      )}
    </PageFrame>
  );
}
