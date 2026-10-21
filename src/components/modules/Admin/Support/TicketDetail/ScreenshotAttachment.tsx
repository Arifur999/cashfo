"use client";

import { ImageOff, Paperclip } from "lucide-react";
import { useState } from "react";
import T from "@/components/shared/T";
import { screenshotUrl } from "@/lib/customer/supportDisplay";

// A screenshot the customer attached, opened full size in a new tab. Room
// is kept for it while it loads, so the thread doesn't jump; one that can't
// load (an expired session, a deleted file) says so instead of showing the
// browser's broken-image glyph, and still offers the link.
const ScreenshotAttachment = ({ attachmentId }: { attachmentId: string }) => {
  const [failed, setFailed] = useState(false);
  const href = screenshotUrl(attachmentId);

  if (failed) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-small text-ink-2 hover:text-ink">
        <ImageOff className="size-3.5 shrink-0" aria-hidden="true" />
        <T>Screenshot couldn&apos;t load, open it</T>
      </a>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-md border border-line bg-surface hover:border-line-strong">
      {/* eslint-disable-next-line @next/next/no-img-element -- a private image behind the session; next/image can't fetch it */}
      <img
        src={href}
        alt=""
        onError={() => setFailed(true)}
        // A load that failed before hydration fired its error unheard.
        ref={(image) => {
          if (image?.complete && image.naturalWidth === 0) setFailed(true);
        }}
        className="min-h-24 max-h-60 max-w-full bg-strip object-contain"
      />
      <span className="flex items-center gap-2 border-t border-line px-3 py-1.5 text-small text-ink-2">
        <Paperclip className="size-3.5" aria-hidden="true" /> <T>Screenshot</T>
      </span>
    </a>
  );
};

export default ScreenshotAttachment;
