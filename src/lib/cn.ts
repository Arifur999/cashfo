import { createCn } from "cn/config";

// The class merger, taught the design's own utilities. Without this, cn()
// takes `text-body` for a colour and drops `text-ink` beside it (or the
// other way round), and treats shadow-card as a shadow colour. tsconfig
// maps the bare "cn" import here too, so the shadcn primitives in
// components/ui merge the same way.
const TEXT_STYLES = [
  "display-xl",
  "display",
  "h1",
  "h2",
  "h3",
  "title",
  "body-lg",
  "body",
  "body-strong",
  "small",
  "caption",
  "overline",
  "amount-lg",
  "amount",
  "amount-sm",
  "bn-heading",
  "bn-body",
  "code",
];

export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [{ text: TEXT_STYLES }],
      shadow: [{ shadow: ["card", "float", "overlay", "button"] }],
      "bg-image": [{ bg: ["aurora", "night", "night-panel", "forest-depth", "fresh", "mint-glow", "wallet-forest", "wallet-teal", "wallet-charcoal", "wallet-mint"] }],
    },
  },
});
