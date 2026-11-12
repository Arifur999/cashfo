import { createCn } from "cn/config";

// The class merger, taught the design's own utilities. Without this, cn()
// takes `text-body` for a colour and drops `text-ink` beside it (or the
// other way round), and treats shadow-card as a shadow colour. tsconfig
// maps the bare "cn" import here too, so the shadcn primitives in
// components/ui merge the same way.
const TEXT_STYLES = [
  "display-xl",
  "page-title",
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
    // rounded-field (10px), rounded-card (18px) and rounded-panel (22px),
    // design-v4: without these a later rounded-lg would not replace them.
    theme: { radius: ["field", "card", "panel"] },
    classGroups: {
      "font-size": [{ text: TEXT_STYLES }],
      shadow: [{ shadow: ["card", "float", "overlay", "drawer", "button", "control"] }],
      "bg-image": [{ bg: ["aurora", "aurora-panel","night", "forest-depth", "fresh", "mint-glow", "wallet-forest", "wallet-green", "wallet-teal", "wallet-charcoal", "wallet-mint", "savings-violet", "savings-teal", "savings-blue", "savings-amber", "savings-rose"] }],
    },
  },
});
