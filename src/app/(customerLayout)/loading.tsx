import RouteLoading from "@/components/shared/RouteLoading";
import { getLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/translate";

// Every customer page renders on the server; this shows while it does, so a
// click is answered at once instead of the old page sitting there. A Server
// Component, so it reads the language cookie itself.
export default async function CustomerLoading() {
  return <RouteLoading label={translate(await getLocale(), "Loading...")} />;
}
