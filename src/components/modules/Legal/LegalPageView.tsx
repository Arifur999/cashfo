import { Languages } from "lucide-react";
import { bnHeading, bnOverline } from "@/components/modules/Auth/bnType";
import Banner from "@/components/smartly/Banner";
import Eyebrow from "@/components/smartly/Eyebrow";
import { getLegalDocument, type LegalPage } from "@/lib/customer/platform";
import { formatCount } from "@/lib/i18n/digits";
import { getTranslator } from "@/lib/i18n/locale";
import { legalBlocks } from "@/lib/legalText";
import { cn } from "@/lib/utils";
import { effectiveDateText } from "./legalDates";
import { legalPageEntry } from "./legalPages";

// One legal page as the admin last saved it, in the reader's language when
// a Bangla version exists: its "## " sections as headings, and beside them,
// on a wide screen, the "On this page" list that jumps to each. Plain text
// with its line breaks kept -- nothing is rendered as HTML. A Bangla reader
// shown the English (no Bangla saved yet) is told so, and the text keeps
// lang="en" so it is read with an English voice.
export default async function LegalPageView({ page }: { page: LegalPage }) {
  const [doc, { locale, t }] = await Promise.all([getLegalDocument(page), getTranslator()]);
  const bangla = locale === "bn" && doc && doc.contentBn?.trim() ? doc.contentBn : null;
  const content = doc ? (bangla ?? doc.contentEn) : null;
  const englishOnly = locale === "bn" && Boolean(doc) && !bangla;
  const blocks = content ? legalBlocks(content) : [];
  const headings = blocks.filter((block) => block.kind === "heading");
  // English text inside a Bangla page: its language and its own face.
  const textLang = englishOnly ? { lang: "en", className: "font-sans" } : { lang: undefined, className: undefined };

  return (
    <>
      <article className="flex min-w-0 flex-col gap-4">
        <header className="flex flex-col gap-2">
          <Eyebrow tone="neutral" className={bnOverline(locale)}>
            {t("Legal")}
          </Eyebrow>
          {/* Named as its side-menu entry and every link to it name it. */}
          <h1 className={cn("text-h1 text-ink md:text-display", bnHeading(locale))}>{t(legalPageEntry(page).label)}</h1>
          {doc && (
            <p className="text-body text-ink-muted">
              {t("Version {version} · in effect from {date}", { version: formatCount(doc.version, locale), date: effectiveDateText(doc.updatedAt, locale, t) })}
            </p>
          )}
        </header>
        {englishOnly && blocks.length > 0 && (
          <Banner tone="neutral" inline role="note" icon={<Languages />} className="font-normal">
            {t("This page is only in English for now.")}
          </Banner>
        )}
        {blocks.length > 0 ? (
          blocks.map((block, index) =>
            block.kind === "heading" ? (
              <h2 key={index} id={block.id} lang={textLang.lang} className={cn("mt-3 scroll-mt-6 text-h2 tracking-normal text-ink", textLang.className)}>
                {block.text}
              </h2>
            ) : (
              <p key={index} lang={textLang.lang} className={cn("text-body-lg leading-[27px] whitespace-pre-line text-ink-2", textLang.className)}>
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
          <Eyebrow tone="neutral" className={cn("pb-2", bnOverline(locale))}>
            {t("On this page")}
          </Eyebrow>
          {headings.map((heading) => (
            <a key={heading.id} href={`#${heading.id}`} lang={textLang.lang} className={cn("py-1 text-small leading-[normal] text-ink-2 hover:text-ink", textLang.className)}>
              {heading.text}
            </a>
          ))}
        </nav>
      )}
    </>
  );
}
