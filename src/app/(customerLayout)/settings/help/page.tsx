import { HelpSection } from "@/components/modules/Customer/Settings/HelpSection";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getSupportMessagesAction } from "@/lib/customer/supportActions";

export const generateMetadata = () => customerPageMetadata("/settings/help");

// /settings/help?open=<question>: a guide can land on its question.
// /settings/help?message=<id>: the bell or a reply email opens that
// conversation with support. Messages that couldn't be read arrive as null,
// so "Your messages" stays and its drawer offers Try again.
export default async function SettingsHelpPage({ searchParams }: PageProps<"/settings/help">) {
  const sp = await searchParams;
  const messages = await getSupportMessagesAction();
  return (
    <HelpSection
      openId={typeof sp.open === "string" ? sp.open : undefined}
      openMessageId={typeof sp.message === "string" ? sp.message : undefined}
      conversations={messages.success ? (messages.data ?? []) : null}
    />
  );
}
