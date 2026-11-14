// The Zakat boards' popup: no rule under the head (Settings draws one),
// 22px sides, a filled 34px close, 14px between fields, the grey strip at
// the foot under a sunken rule, and its words at normal line height. Focus
// starts on the popup itself, as nothing on the boards is focused.
export const ZAKAT_POPUP = {
  headClassName: "border-b-0 px-5.5 pt-5 pb-1.5 [&>div:first-child]:gap-0.75",
  subClassName: "text-[13px] leading-[normal]",
  closeClassName: "my-0 size-8.5 bg-page text-ink-2 hover:bg-sunken-rule [&_svg]:size-4",
  bodyClassName: "gap-3.5 px-5.5 pt-3 pb-4.5",
  footerClassName: "border-sunken-rule px-5.5 py-3.5",
  className: "leading-[normal]",
  onOpenAutoFocus: (event: Event) => {
    event.preventDefault();
    (event.currentTarget as HTMLElement | null)?.focus();
  },
};
