import { HelpSection } from "@/components/modules/Customer/Settings/HelpSection";
import { getHelpPage } from "@/lib/customer/helpPageReader";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getSupportMessagesAction } from "@/lib/customer/supportActions";

export const generateMetadata = () => customerPageMetadata("/settings/help");

// /settings/help?open=<question>: a guide can land on its question.
// /settings/help?message=<id>: the bell or a reply email opens that
// conversation with support. Messages that couldn't be read arrive as null,
// so "My messages" stays and offers Try again; so does the company card.
export default async function SettingsHelpPage({ searchParams }: PageProps<"/settings/help">) {
  const sp = await searchParams;
  const [messages, help] = await Promise.all([getSupportMessagesAction(), getHelpPage()]);
  return (
    <HelpSection
      openId={typeof sp.open === "string" ? sp.open : undefined}
      openMessageId={typeof sp.message === "string" ? sp.message : undefined}
      conversations={messages.success ? (messages.data ?? []) : null}
      help={help}
    />
  );
}
