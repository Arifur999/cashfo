"use client";

import { FileText, Languages } from "lucide-react";
import Link from "next/link";
import Chip from "@/components/smartly/Chip";
import IconTile from "@/components/smartly/IconTile";
import { liveAnnouncements, missingBangla, translationCoverage } from "@/lib/adminDashboard";
import { formatDate } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatNumber } from "@/lib/number";
import type { AnnouncementStatus, IAnnouncement } from "@/types/announcement.types";
import type { ILegalDocument, LegalDocType } from "@/types/legalDocument.types";
import type { ITranslation } from "@/types/translation.types";
import { Greeting, Kpi, Section, SectionLink, Unavailable } from "./pieces";

export interface ContentDashboardData {
  translations: ITranslation[] | null;
  announcements: IAnnouncement[] | null;
  legal: ILegalDocument[] | null;
  categories: number | null;
}

interface ContentDashboardProps extends ContentDashboardData {
  adminName: string;
  hour: number;
}

// English, passed through translate().
const LEGAL_LABEL: Record<LegalDocType, string> = { TERMS_OF_SERVICE: "Terms of service", PRIVACY_POLICY: "Privacy policy", REFUND_POLICY: "Refund policy", FAQ: "FAQ" };
const ANNOUNCEMENT_STATUS: Record<AnnouncementStatus, { label: string; tone: "income" | "info" | "neutral" }> = { ACTIVE: { label: "Live", tone: "income" }, SCHEDULED: { label: "Scheduled", tone: "info" }, EXPIRED: { label: "Ended", tone: "neutral" }, DISABLED: { label: "Off", tone: "neutral" } };

// The content admin's dashboard: the words and pages still missing their
// Bangla, and what is showing to people now.
export function ContentDashboard({ adminName, hour, translations, announcements, legal, categories }: ContentDashboardProps) {
  const { translate } = useLocale();
  const coverage = translations ? translationCoverage(translations) : null;
  const live = announcements ? liveAnnouncements(announcements) : [];
  const legalMissing = legal ? missingBangla(legal) : [];
  const latest = announcements ? [...announcements].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5) : [];
  const todo = [
    ...(coverage && coverage.missing > 0 ? [{ key: "words", icon: <Languages />, title: `${formatNumber(coverage.missing)} ${translate("Words without Bangla")}`, sub: `${coverage.pct}% ${translate("Bangla coverage")}`, href: "/admin/content/translations", link: translate("Open translations") }] : []),
    ...legalMissing.map((doc) => ({ key: doc.id, icon: <FileText />, title: `${translate(LEGAL_LABEL[doc.type])} ${translate("has no Bangla version")}`, sub: `${translate("version")} ${doc.version} · ${translate("updated")} ${formatDate(doc.updatedAt, "d MMM")}`, href: "/admin/content/legal", link: translate("Open legal pages") })),
  ];

  return (
    <div className="flex flex-col gap-4">
      <Greeting name={adminName} hour={hour} line={translate("words and pages that need you.")} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label={translate("Bangla coverage")} value={coverage ? `${coverage.pct}%` : "—"} note={coverage ? translate("{missing} of {total} words missing", { missing: formatNumber(coverage.missing), total: formatNumber(coverage.total) }) : undefined} className="[&>span:nth-child(2)]:text-pillar-insights" />
        <Kpi label={translate("Live announcements")} value={announcements ? formatNumber(live.length) : "—"} note={translate("showing to people now")} />
        <Kpi label={translate("Legal pages")} value={legal ? formatNumber(legal.length) : "—"} chip={legalMissing.length > 0 ? { text: `${legalMissing.length} ${translate("without Bangla")}`, tone: "warning" } : null} />
        <Kpi label={translate("Starting categories")} value={categories !== null ? formatNumber(categories) : "—"} note={translate("for a new workspace")} />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Section title={translate("Needs you now")}>
          {todo.length === 0 ? (
            <Unavailable>{translate("Everything has its Bangla. Nothing waits.")}</Unavailable>
          ) : (
            <div className="flex flex-col">
              {todo.map((item, index) => (
                <div key={item.key} className={`flex items-center gap-3 py-3 ${index > 0 ? "border-t border-surface-sunken" : ""}`}>
                  <IconTile size={36} tone="insights">
                    {item.icon}
                  </IconTile>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-body font-semibold text-ink">{item.title}</span>
                    <span className="text-small text-ink-muted">{item.sub}</span>
                  </span>
                  <Link href={item.href} className="shrink-0 rounded-md border border-line-strong bg-surface px-3.5 py-2 text-small font-semibold text-ink hover:bg-surface-sunken">
                    {item.link}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Section>
        <Section title={translate("Latest announcements")} aside={<SectionLink href="/admin/content/announcements">{translate("All announcements")}</SectionLink>}>
          {latest.length === 0 ? (
            <Unavailable>{translate("No announcement yet.")}</Unavailable>
          ) : (
            <div className="flex flex-col">
              {latest.map((announcement, index) => (
                <div key={announcement.id} className={`flex items-center gap-3 py-2.5 ${index > 0 ? "border-t border-surface-sunken" : ""}`}>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body font-semibold text-ink">{announcement.title}</span>
                    <span className="text-caption text-ink-muted">{formatDate(announcement.startAt, "d MMM")}</span>
                  </span>
                  <Chip tone={ANNOUNCEMENT_STATUS[announcement.status].tone} size="sm">
                    {translate(ANNOUNCEMENT_STATUS[announcement.status].label)}
                  </Chip>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
