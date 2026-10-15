"use client";

import { ArrowLeftRight,BookOpen,BookText,Box,CalendarCheck,ChartColumn,ChartPie,ChevronDown,ChevronRight,CircleCheckBig,Clock,CreditCard,Gift,GraduationCap,House,KeyRound,ListChecks,type LucideProps,Moon,PenLine,PiggyBank,Settings,Table2,Target,TrendingUp,Users,UsersRound,Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { useFeature } from "@/components/modules/Customer/Providers/PlatformProvider";
import { useTodayTasks } from "@/components/modules/Customer/Providers/TodayTasksProvider";
import { MosqueIcon } from "@/components/smartly/icons";
import { findNavLocation, NAV_FOOT, visibleNavSections, type NavIcon, type NavItem, type NavLeaf, type NavTone } from "@/lib/customer/nav";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const ICONS: Record<NavIcon, React.ComponentType<LucideProps>> = {
  home: House,
  transactions: ArrowLeftRight,
  wallet: Wallet,
  budget: ChartPie,
  income: TrendingUp,
  loans: CreditCard,
  savings: PiggyBank,
  assets: Box,
  group: Users,
  today: CircleCheckBig,
  daily: CalendarCheck,
  namaz: MosqueIcon,
  ramadan: Moon,
  library: BookOpen,
  skills: GraduationCap,
  todo: ListChecks,
  vault: KeyRound,
  insights: ChartColumn,
  reports: Table2,
  challenges: Target,
  ledger: BookText,
  people: UsersRound,
  clock: Clock,
  journal: PenLine,
  gift: Gift,
  settings: Settings,
};

// The Night sidebar is dark in both themes, so its dots use the dark
// palette outright.
const NIGHT_DOT: Record<NavTone, string> = {
  money: "bg-[#4CC995]",
  loans: "bg-[#F0A46A]",
  habits: "bg-[#B6A2FF]",
  vault: "bg-[#86ABF2]",
  insights: "bg-[#5CCCDB]",
  neutral: "bg-[#C3D2CA]",
};

const MARKER = "absolute -left-3 w-0.75 rounded-r-[3px] bg-[#14B57A]";

const leafHref = (leaf: NavLeaf) => (leaf.query ? `${leaf.href}?${new URLSearchParams(leaf.query)}` : leaf.href);

interface SidebarNavProps {
  // Phone rows are 44px with 16px text; the desktop sidebar's 40px with 14px.
  compact?: boolean;
  className?: string;
  style?: React.CSSProperties;
  navRef?: React.Ref<HTMLElement>;
}

// Uses the shell's providers for what the menu depends on: the workspace
// (Books), the feature flags (Loans) and today's open tasks (the badge).
export function useNavSections() {
  const { activeBusiness } = useAuth();
  const loansOn = useFeature("loan_management");
  return visibleNavSections({ workspaceType: activeBusiness?.type, isFeatureOn: (key) => (key === "loan_management" ? loansOn : true) });
}

// The menu itself, shared by the desktop sidebar and the phone drawer.
export function SidebarNav({ compact = true, className, style, navRef }: SidebarNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const { openCount } = useTodayTasks();
  const sections = useNavSections();
  const location = findNavLocation(pathname, searchParams, sections);

  const renderItem = (item: NavItem) => {
    const Icon = ICONS[item.icon];
    const self = location?.item === item && !location.sub;
    const inGroup = !!item.subs && location?.item === item;
    const lit = self || inGroup;
    const Chevron = inGroup ? ChevronDown : ChevronRight;
    return (
      <div key={`${item.label}:${item.href}`} className="flex flex-col">
        <Link
          href={leafHref(item)}
          aria-current={self ? "page" : undefined}
          aria-expanded={item.subs ? inGroup : undefined}
          className={cn(
            "relative flex items-center gap-3 rounded-md px-3 transition-colors",
            compact ? "h-10 text-body" : "h-11 text-body-lg",
            lit ? "font-semibold text-white" : "font-medium text-white/74 hover:bg-white/6 hover:text-white",
            self && "bg-mint-200/14",
          )}
        >
          {self && <span aria-hidden="true" className={cn(MARKER, "h-5", compact ? "top-2.5" : "top-3")} />}
          <Icon className={cn("shrink-0", compact ? "size-4.5" : "size-4.75", lit ? "opacity-100" : "opacity-85")} strokeWidth={1.9} />
          <span className="min-w-0 flex-1 truncate">{t(item.label)}</span>
          {item.badge === "todayTasks" && openCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-mint-200/16 px-2 text-caption font-bold text-mint-200 tabular-nums">{openCount}</span>
          )}
          {item.tag && <span className="flex h-5.5 items-center rounded-full bg-mint-glow px-2 text-caption font-bold text-forest">{t(item.tag)}</span>}
          {item.subs && <Chevron className="size-4 shrink-0 opacity-60" strokeWidth={2} />}
        </Link>
        {inGroup &&
          item.subs!.map((sub) => {
            const on = location?.sub === sub;
            return (
              <Link
                key={sub.href}
                href={leafHref(sub)}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "relative flex items-center rounded-md pr-3 pl-10 transition-colors",
                  compact ? "h-8.5 text-small" : "h-10 text-body",
                  on ? "bg-mint-200/14 font-semibold text-white" : "font-medium text-white/68 hover:text-white",
                )}
              >
                <span aria-hidden="true" className="absolute top-0 bottom-0 left-5.25 w-px bg-mint-200/16" />
                {on && <span aria-hidden="true" className="absolute top-2.75 left-4.75 h-3 w-1.25 rounded-full bg-[#14B57A]" />}
                {t(sub.label)}
              </Link>
            );
          })}
      </div>
    );
  };

  return (
    <nav ref={navRef} aria-label={t("Main")} style={style} className={cn("relative min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}>
      <div className="flex flex-col gap-0.5">
        {sections.map((section) => (
          <div key={section.label ?? "home"} className="flex flex-col gap-0.5">
            {section.label && (
              <span className={cn("flex items-center gap-2 px-3 pt-4 pb-2 text-caption font-bold tracking-[0.1em] text-mint-200/62 uppercase", compact ? "h-9" : "h-10")}>
                <span aria-hidden="true" className={cn("size-1.5 rounded-full", NIGHT_DOT[section.tone])} />
                {t(section.label)}
              </span>
            )}
            {section.items.map(renderItem)}
          </div>
        ))}
      </div>
    </nav>
  );
}

// Invite & earn and Settings, under the scrolling menu.
export function SidebarFoot({ compact = true }: { compact?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const sections = useNavSections();
  const location = findNavLocation(pathname, searchParams, sections);

  return (
    <div className="flex flex-col gap-0.5">
      {NAV_FOOT.map((item) => {
        const Icon = ICONS[item.icon];
        const on = location?.item === item;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-3 rounded-md px-3 transition-colors",
              compact ? "h-10 text-body" : "h-11 text-body",
              on ? "bg-mint-200/14 font-semibold text-white" : "font-medium text-white/74 hover:bg-white/6 hover:text-white",
            )}
          >
            {on && <span aria-hidden="true" className={cn(MARKER, "h-5", compact ? "top-2.5" : "top-3")} />}
            <Icon className={cn("shrink-0", compact ? "size-4.5" : "size-4.75")} strokeWidth={1.9} />
            <span className="flex-1">{t(item.label)}</span>
            {item.tag && <span className="flex h-5.5 items-center rounded-full bg-mint-glow px-2 text-caption font-bold text-forest">{t(item.tag)}</span>}
          </Link>
        );
      })}
    </div>
  );
}
