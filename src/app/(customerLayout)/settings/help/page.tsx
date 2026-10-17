import { HelpSection } from "@/components/modules/Customer/Settings/HelpSection";

// /settings/help?open=<question>: a guide can land on its question.
export default async function SettingsHelpPage({ searchParams }: PageProps<"/settings/help">) {
  const sp = await searchParams;
  return <HelpSection openId={typeof sp.open === "string" ? sp.open : undefined} />;
}
