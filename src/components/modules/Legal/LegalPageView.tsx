import Eyebrow from "@/components/smartly/Eyebrow";
import { getLegalDocument, type LegalPage } from "@/lib/customer/platform";
import { formatDate } from "@/lib/date";
import { getLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/translate";
import { legalBlocks } from "@/lib/legalText";
import { LEGAL_PAGES } from "./legalPages";

// One legal page as the admin last saved it, in the reader's language when
// a Bangla version exists: its "## " sections as headings, and beside them,
// on a wide screen, the "On this page" list that jumps to each. Plain text
// with its line breaks kept -- nothing is rendered as HTML.
export default async function LegalPageView({ page }: { page: LegalPage }) {
  const [doc, locale] = await Promise.all([getLegalDocument(page), getLocale()]);
  const t = (key: string) => translate(locale, key);
  const content = doc ? (locale === "bn" && doc.contentBn ? doc.contentBn : doc.contentEn) : null;
  const blocks = content ? legalBlocks(content) : [];
  const headings = blocks.filter((block) => block.kind === "heading");
  // Named as its side-menu entry names it.
  const title = LEGAL_PAGES.find((entry) => entry.page === page)?.label ?? "";

  return (
    <>
      <article className="flex min-w-0 flex-col gap-4">
        <header className="flex flex-col gap-2">
          <Eyebrow tone="neutral">{t("Legal")}</Eyebrow>
          <h1 className="text-h1 text-ink md:text-display">{t(title)}</h1>
          {doc && (
            <p className="text-body text-ink-muted">
              {t("Version")} {doc.version} · {t("Last updated")} {formatDate(doc.updatedAt, "d MMMM yyyy")}
            </p>
          )}
        </header>
        {blocks.length > 0 ? (
          blocks.map((block, index) =>
            block.kind === "heading" ? (
              <h2 key={index} id={block.id} className="mt-3 scroll-mt-6 text-h2 tracking-normal text-ink">
                {block.text}
              </h2>
            ) : (
              <p key={index} className="text-body-lg leading-[27px] whitespace-pre-line text-ink-2">
                {block.text}
              </p>
            ),
          )
        ) : (
          <p className="text-body text-ink-muted">{t("This page isn't available right now. Please check back later.")}</p>
        )}
      </article>
      {headings.length > 0 && (
        <nav aria-label={t("On this page")} className="hidden flex-col gap-1 self-start xl:sticky xl:top-6 xl:flex">
          <span className="pb-2 text-caption leading-[normal] font-bold tracking-[0.08em] text-ink-muted uppercase">{t("On this page")}</span>
          {headings.map((heading) => (
            <a key={heading.id} href={`#${heading.id}`} className="py-1 text-small leading-[normal] text-ink-2 hover:text-ink">
              {heading.text}
            </a>
          ))}
        </nav>
      )}
    </>
  );
}
