"use client";

import { FileText, Languages } from "lucide-react";
import Link from "next/link";
import Button from "@/components/smartly/Button";
import Chip from "@/components/smartly/Chip";
import IconTile from "@/components/smartly/IconTile";
import { ListCell, ListRow, ListRowActions } from "@/components/smartly/list";
import { liveAnnouncements, missingBangla, translationCoverage } from "@/lib/adminDashboard";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural } from "@/lib/i18n/message";
import { cn } from "@/lib/utils";
import type { AnnouncementStatus, IAnnouncement } from "@/types/announcement.types";
import type { ILegalDocument, LegalDocType } from "@/types/legalDocument.types";
import type { ITranslation } from "@/types/translation.types";
import { dayLabel } from "./dashboardDates";
import { COULD_NOT_LOAD, Greeting, Kpi, LoadFailed, SECTION_ROW, Section, SectionLink, SectionTable, Unavailable } from "./pieces";

// Every null below is a call that failed: the card says so rather than
// showing an empty or all-clear state.
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
  const { translate, locale } = useLocale();
  const count = (value: number) => formatCount(value, locale);
  const coverage = translations ? translationCoverage(translations) : null;
  const live = announcements ? liveAnnouncements(announcements) : [];
  const legalMissing = legal ? missingBangla(legal) : [];
  const latest = announcements ? [...announcements].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5) : [];
  const todo = [
    ...(coverage && coverage.missing > 0
      ? [
          {
            key: "words",
            icon: <Languages />,
            title: plural(translate, coverage.missing, "{count} word without Bangla", "{count} words without Bangla", { count: count(coverage.missing) }),
            sub: translate("{percent}% have Bangla", { percent: toLocaleDigits(String(coverage.pct), locale) }),
            href: "/admin/content/translations",
            link: translate("Open translations"),
          },
        ]
      : []),
    ...legalMissing.map((doc) => ({
      key: doc.id,
      icon: <FileText />,
      title: translate("{doc} has no Bangla version", { doc: translate(LEGAL_LABEL[doc.type]) }),
      sub: translate("Version {version} · updated {date}", { version: toLocaleDigits(String(doc.version), locale), date: dayLabel(doc.updatedAt, locale) }),
      href: "/admin/content/legal",
      link: translate("Open legal pages"),
    })),
  ];
  // Some of the checks failed: "nothing waits" can't be said.
  const checksFailed = translations === null || legal === null;

  return (
    <div className="flex flex-col gap-4">
      <Greeting name={adminName} hour={hour} line={translate("words and pages that need you.")} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Bangla coverage"
          value={coverage ? toLocaleDigits(`${coverage.pct}%`, locale) : "—"}
          note={coverage ? translate("{missing} of {total} words missing", { missing: count(coverage.missing), total: count(coverage.total) }) : COULD_NOT_LOAD}
          className="[&>span:nth-child(2)]:text-pillar-insights"
        />
        <Kpi label="Live announcements" value={announcements ? count(live.length) : "—"} note={announcements ? "showing to people now" : COULD_NOT_LOAD} />
        <Kpi
          label="Legal pages"
          value={legal ? count(legal.length) : "—"}
          chip={legalMissing.length > 0 ? { text: translate("{count} without Bangla", { count: count(legalMissing.length) }), tone: "warning" } : null}
          note={legal ? undefined : COULD_NOT_LOAD}
        />
        <Kpi label="Starting categories" value={categories !== null ? count(categories) : "—"} note={categories !== null ? "for a new workspace" : COULD_NOT_LOAD} />
      </div>

      {/* Side by side only from xl: at lg the to-do rows would squeeze their words beside the button. */}
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Section title={translate("Needs you now")} flush={todo.length > 0 && !checksFailed}>
          {todo.length === 0 && !checksFailed && <Unavailable>{translate("Everything has its Bangla. Nothing waits.")}</Unavailable>}
          {todo.length > 0 && (
            <SectionTable label={translate("Needs you now")} className={cn(checksFailed && "mb-0")}>
              {todo.map((item) => (
                <ListRow key={item.key} className={cn(SECTION_ROW, "grid-cols-[auto_minmax(0,1fr)] gap-x-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]")}>
                  <ListCell>
                    <IconTile size={36} tone="insights">
                      {item.icon}
                    </IconTile>
                  </ListCell>
                  <ListCell className="flex flex-col">
                    <span className="text-body font-semibold text-ink">{item.title}</span>
                    <span className="text-small text-ink-muted">{item.sub}</span>
                  </ListCell>
                  {/* Under the words on a phone, beside them from sm up. */}
                  <ListRowActions className="col-start-2 justify-start sm:col-start-auto sm:justify-end">
                    <Button asChild variant="secondary" size="sm" className="pointer-coarse:h-11">
                      <Link href={item.href}>{item.link}</Link>
                    </Button>
                  </ListRowActions>
                </ListRow>
              ))}
            </SectionTable>
          )}
          {checksFailed && <LoadFailed />}
        </Section>
        <Section title={translate("Latest announcements")} aside={<SectionLink href="/admin/content/announcements">{translate("All announcements")}</SectionLink>} flush={latest.length > 0}>
          {announcements === null ? (
            <LoadFailed />
          ) : latest.length === 0 ? (
            <Unavailable>{translate("No announcement yet.")}</Unavailable>
          ) : (
            <SectionTable label={translate("Latest announcements")}>
              {latest.map((announcement) => (
                <ListRow key={announcement.id} density="dense" className={cn(SECTION_ROW, "py-2")}>
                  <ListCell className="flex flex-col">
                    <span className="truncate text-body font-semibold text-ink">{announcement.title}</span>
                    <span className="text-caption text-ink-muted">{dayLabel(announcement.startAt, locale)}</span>
                  </ListCell>
                  <ListCell align="end">
                    <Chip tone={ANNOUNCEMENT_STATUS[announcement.status].tone} size="sm">
                      {translate(ANNOUNCEMENT_STATUS[announcement.status].label)}
                    </Chip>
                  </ListCell>
                </ListRow>
              ))}
            </SectionTable>
          )}
        </Section>
      </div>
    </div>
  );
}
