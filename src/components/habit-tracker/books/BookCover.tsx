import { paletteFor } from "./bookPalette";
import { SERIF_STACK } from "./fonts";

interface BookCoverProps {
  title: string;
  author?: string;
  color: string;
  // Sets the width (the cover keeps a 2:3 shape), e.g. "w-28".
  className?: string;
}

// A typographic cover drawn in CSS -- a spine, a soft light from the top-left,
// the title in a serif -- so every book looks like a book with no image
// upload. Type sizes use container-query units (cqw), so it scales with the
// cover's width wherever it's used.
export function BookCover({ title, author, color, className = "" }: BookCoverProps) {
  const palette = paletteFor(color);
  return (
    <div
      aria-hidden
      className={`@container relative aspect-[2/3] shrink-0 overflow-hidden rounded-l-[3px] rounded-r-md shadow-lg shadow-black/30 ${className}`}
      style={{ backgroundImage: `linear-gradient(135deg, ${palette.from}, ${palette.to})`, color: palette.ink, fontFamily: SERIF_STACK }}
    >
      <div className="absolute inset-y-0 left-0 w-[7%] bg-black/25 shadow-[inset_-1px_0_0_rgba(255,255,255,0.18)]" />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0)_40%)]" />
      <div className="absolute inset-y-0 left-[7%] right-0 flex flex-col items-center justify-between px-[9%] py-[11%] text-center">
        <div className="h-px w-1/3 opacity-60" style={{ backgroundColor: palette.ink }} />
        <p className="line-clamp-5 w-full break-words text-[12cqw] font-semibold leading-[1.18]">{title}</p>
        {author ? (
          <p className="line-clamp-2 w-full break-words text-[6.5cqw] font-medium uppercase leading-tight tracking-[0.1em] opacity-80">{author}</p>
        ) : (
          <div className="h-px w-1/4 opacity-60" style={{ backgroundColor: palette.ink }} />
        )}
      </div>
    </div>
  );
}
