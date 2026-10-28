"use client";

import { ArrowRight, Link2Off, MailCheck, MailQuestion } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { confirmEmailAction } from "@/app/(auth)/verify-email/_action";
import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import T from "@/components/shared/T";
import Button from "@/components/smartly/Button";
import { CUSTOMER_HOME_ROUTE } from "@/lib/authUtils";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import AuthHeading from "./AuthHeading";
import FormErrorCallout from "./FormErrorCallout";
import { useAuthAction } from "./useAuthAction";

interface VerifyEmailFlowProps {
  token: string;
  // What the link check said as the page opened: usable (with the address
  // it confirms), used up or expired, missing its token, or no answer.
  status: "valid" | "invalid" | "incomplete" | "unknown";
  email?: string;
}

const Tile = ({ tone, children }: { tone: "mint" | "red"; children: React.ReactNode }) => (
  <span aria-hidden="true" className={cn("flex size-13 items-center justify-center rounded-[14px] [&_svg]:size-6", tone === "mint" ? "bg-mint-50 text-emerald" : "bg-expense-soft text-expense")}>
    {children}
  </span>
);

// /verify-email?token=: the link from "Send a verification email" (Settings
// > Profile). The page asks first and confirms on a button -- mail scanners
// open every link, and must not confirm an address -- then says it's done.
// Works signed in or out.
const VerifyEmailFlow = ({ token, status, email }: VerifyEmailFlowProps) => {
  const { t } = useLocale();
  const [opened] = useState(status);
  const [verified, setVerified] = useState<string | null>(null);
  const { run, error, isPending } = useAuthAction(confirmEmailAction);

  // Opens the app when signed in; the sign-in page sends a signed-out
  // visitor to sign in first.
  const openApp = (
    <Button size="lg" className="w-full text-[15px]" asChild>
      <Link href={CUSTOMER_HOME_ROUTE}>
        {t("Open the app")}
        <ArrowRight className="size-4" strokeWidth={2.25} aria-hidden="true" />
      </Link>
    </Button>
  );

  if (verified) {
    return (
      <>
        <Tile tone="mint">
          <MailCheck />
        </Tile>
        <AuthHeading focusOnMount title="Your email is confirmed" subtitle={<T values={{ email: <b className="font-semibold break-all text-ink">{verified}</b> }}>{"{email} is confirmed. Security emails and receipts will go there."}</T>} />
        {openApp}
      </>
    );
  }

  if (opened === "incomplete" || opened === "invalid") {
    return (
      <>
        <Tile tone="red">
          <Link2Off />
        </Tile>
        <AuthHeading
          title={opened === "incomplete" ? "This link is incomplete" : "This link no longer works"}
          subtitle={opened === "incomplete" ? "Open the link from the email again." : "A confirmation link works once and lasts a day. Send a new one from Settings › Profile and open the newest email."}
        />
        {openApp}
      </>
    );
  }

  return (
    <>
      <Tile tone="mint">
        <MailQuestion />
      </Tile>
      <AuthHeading
        title="Confirm your email"
        subtitle={
          email ? <T values={{ email: <b className="font-semibold break-all text-ink">{email}</b> }}>{"Confirm that {email} is your email address."}</T> : "Confirm that this is your email address."
        }
      />
      <form
        className="flex flex-col gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const answer = await run(token);
          if (answer?.success) setVerified(answer.email);
        }}
      >
        <FormErrorCallout error={error} />
        <AppSubmitButton isPending={isPending} pendingLabel={t("Confirming...")} size="lg" className="text-[15px] max-md:h-12 max-md:text-body-lg">
          {t("Confirm my email")}
        </AppSubmitButton>
      </form>
    </>
  );
};

export default VerifyEmailFlow;
