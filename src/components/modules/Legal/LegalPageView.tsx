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
    <article className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">{t(title)}</h1>
        {doc && (
          <p className="text-xs text-muted-foreground">
            {t("Last updated")} {formatDate(doc.updatedAt)} · {t("Version")} {doc.version}
          </p>
        )}
      </header>
      {content ? (
        <div className="whitespace-pre-line text-sm leading-7 text-foreground">{content}</div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("This page isn't available right now. Please check back later.")}</p>
      )}
    </article>
  );
}
