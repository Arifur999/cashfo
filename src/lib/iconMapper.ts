import {
  AlertOctagon,
  AlertTriangle,
  BarChart3,
  Bell,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  HelpCircle,
  Inbox,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  Lock,
  Percent,
  Server,
  Settings,
  Shield,
  ShieldAlert,
  Tag,
  Timer,
  TrendingUp,
  UserCog,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

// Nav and stats configs cross the server/client boundary as plain data, and a
// component isn't serializable -- so they carry an icon NAME, resolved here.
// An explicit registry rather than `import * as Icons`, which would ship the
// entire lucide set to the browser.
const ICONS = {
  AlertOctagon,
  AlertTriangle,
  BarChart3,
  Bell,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Inbox,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  Lock,
  Percent,
  Server,
  Settings,
  Shield,
  ShieldAlert,
  Tag,
  Timer,
  TrendingUp,
  UserCog,
  UserPlus,
  Users,
  Wallet,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export const getIconComponent = (iconName: IconName): LucideIcon => ICONS[iconName] ?? HelpCircle;
