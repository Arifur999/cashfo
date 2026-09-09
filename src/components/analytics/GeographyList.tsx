import type { GeographyCityEntry } from "@/lib/api";
import { t } from "@/lib/i18n/t";
import { HorizontalBarList } from "./HorizontalBarList";

export function GeographyList({ cities }: { cities: GeographyCityEntry[] }) {
  const items = cities.map((c) => ({ label: c.city, value: c.userCount, sublabel: t("users") }));
  return <HorizontalBarList items={items} />;
}
