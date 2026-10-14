import Eyebrow from "@/components/smartly/Eyebrow";
import { getLegalDocument, type LegalPage } from "@/lib/customer/platform";
import { formatDate } from "@/lib/date";
import { getLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/translate";

// One legal page as the admin last saved it, in the reader's language when
// a Bangla version exists. Plain text with its line breaks kept -- the
// editor stores text, so nothing is rendered as HTML.
export default async function LegalPageView({ page, title }: { page: LegalPage; title: string }) {
  const [doc, locale] = await Promise.all([getLegalDocument(page), getLocale()]);
  const t = (key: string) => translate(locale, key);
  const content = doc ? (locale === "bn" && doc.contentBn ? doc.contentBn : doc.contentEn) : null;

  return (
    <article className="flex flex-col gap-4">
      <header className="flex flex-col gap-2">
        <Eyebrow tone="neutral">{t("Legal")}</Eyebrow>
        <h1 className="text-h1 text-ink md:text-display">{t(title)}</h1>
        {doc && (
          <p className="text-body text-ink-muted">
            {t("Version")} {doc.version} · {t("Last updated")} {formatDate(doc.updatedAt, "d MMMM yyyy")}
          </p>
        )}
      </header>
      {content ? (
        <div className="text-body-lg leading-[27px] whitespace-pre-line text-ink-2">{content}</div>
      ) : (
        <p className="text-body text-ink-muted">{t("This page isn't available right now. Please check back later.")}</p>
      )}
    </article>
  );
}
