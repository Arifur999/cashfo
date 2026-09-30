# user-frontend — Redesign Phase 0 অডিট

> তারিখ: 2026-09-30 · branch: `redesign` · এই Phase-এ কোনো কোড বদলানো হয়নি।
> Baseline: `npm run build` ✅ পাস (৪৫টা route), `npm run lint` ✅ পাস।

---

## ০. সংক্ষেপে সবচেয়ে জরুরি কথা

1. **অ্যাপটা প্ল্যানের ধারণার চেয়ে অনেক বড়।** প্ল্যান ধরে নিয়েছে ~৮টা পেজ (ড্যাশবোর্ড, লেনদেন, ক্যাটাগরি, অ্যাকাউন্ট, বাজেট, রিপোর্ট, সেটিংস)। আসলে আছে **৪৫টা route, ৯টা ফিচার এরিয়া + আলাদা একটা "Habit Tracker" মোড**, মোট ~২৯,০০০ লাইন কোড। Phase 7 ("বাকি পেজ") একটা session-এ হবে না, ভাগ করতে হবে (নিচে §৯)।
2. **লেনদেন edit/delete হয় না।** এটা double-entry অ্যাকাউন্টিং, লেনদেন শুধু **Void** করা যায় (`/transactions/[id]` পেজে)। প্ল্যানের "সারিতে hover করলে এডিট/মুছুন" বা "মুছার পর Undo" এর জন্য কোনো API নেই।
3. **Personal/Business workspace switcher নেই।** product সিদ্ধান্তে সরানো হয়েছে, এখন প্রতিটা অ্যাকাউন্ট single-workspace। তবে sidebar-এ আলাদা একটা **Money Tracker ↔ Habit Tracker** মোড সুইচ আছে (TopBar-এর "Switch" বাটন)।
4. **মোবাইলে লেআউট ভাঙা।** Sidebar সবসময় 256px চওড়া, লুকানোর বা hamburger-এর ব্যবস্থা নেই। 390px স্ক্রিনে কনটেন্টের জন্য ~১৩৪px জায়গা থাকে।
5. **Loading/Error state একদম নেই।** কোনো `loading.tsx`, `error.tsx`, skeleton নেই। আর data fetcher-গুলো error হলে খালি array ফেরত দেয়, তাই backend বন্ধ থাকলে "কোনো লেনদেন নেই" দেখায় (বিভ্রান্তিকর)।
6. **Brand রং:** এখন green (`#2c8655`) + dark-green sidebar, আর admin-frontend-ও একই palette ব্যবহার করে। প্ল্যানে indigo `#4F46E5` চাওয়া হয়েছে। বদলালে দুই অ্যাপের brand আলাদা হয়ে যাবে। এটা ইউজারের সিদ্ধান্ত (§১০)।

---

## ১. রিপো, deploy ও স্ট্যাক

| বিষয় | তথ্য |
|---|---|
| লোকেশন | `C:\Money management tracker\user-frontend` (আলাদা git repo; `backend/`, `admin-frontend/` পাশের ফোল্ডারে আলাদা repo) |
| Remote | `origin` → `github.com/Arifur999/cashfo.git`, **admin-frontend-এর সাথে একই repo** |
| Branch ম্যাপিং | local `main` → **`origin/user-frontend`** (`origin/main` admin-frontend-এর, সেখানে কখনো push নয়) |
| Vercel | project `user-frontend` (`.vercel/project.json`)। Production branch সম্ভবত `user-frontend`, Vercel dashboard-এ নিশ্চিত করতে হবে। Preview-এর জন্য Vercel-এ **Preview environment-এ `API_BASE_URL`** সেট আছে কিনা দেখতে হবে। |
| Framework | Next.js **16.3.4** (Turbopack, App Router, `middleware.ts`-এর বদলে `src/proxy.ts`), React 19.2 |
| Styling | **Tailwind CSS v4** (CSS-first: `@theme inline` in `src/app/globals.css`, কোনো `tailwind.config` নেই) |
| UI লাইব্রেরি | নেই। shadcn/Radix/Headless UI কিছুই নেই, সব hand-rolled। `lucide-react` (আইকন), `sonner` (toast) |
| `clsx`, `tailwind-merge` | dependency-তে আছে কিন্তু **কোথাও ব্যবহার হয়নি** (০টা import) |
| চার্ট | কোনো লাইব্রেরি নেই, সব hand-rolled (§৬) |
| HTTP | `axios`, **শুধু server-side** (Server Components + Server Actions) |
| Test | কোনো test runner নেই |

---

## ২. সব route ও প্রতিটায় কী আছে

**Nav** কলাম: sidebar-এর কোথায় আছে। "orphan" মানে কোথাও লিংক নেই, শুধু URL দিয়ে যাওয়া যায়।

### Auth (public, `src/app/(auth)/`, কোনো shared layout নেই)
| Route | কী আছে | Component |
|---|---|---|
| `/` | `/login`-এ redirect | — |
| `/login` | Email, password (দেখুন/লুকান), "Forgot password?" লিংক, EN/বাং টগল, সাবমিটে spinner, inline error | `auth/LoginForm` |
| `/register` | Name, email, phone (ঐচ্ছিক), password, confirm। ক্লায়েন্ট-সাইড validation (৮ অক্ষর, অক্ষর+সংখ্যা)। **পাসওয়ার্ড শক্তি নির্দেশক নেই** | `auth/RegisterForm` |
| `/forgot-password` | Email → "Check your email" অবস্থা | `auth/ForgotPasswordForm` |
| `/reset-password` | URL token, নতুন পাসওয়ার্ড + confirm | `auth/ResetPasswordForm` |
| `/choose-workspace` | workspace বাছাই (≤১টা থাকলে `/dashboard`-এ redirect করে) | orphan |

### Money Tracker মোড (`src/app/(dashboard)/`)
| Route | Nav | কী আছে | মূল Component |
|---|---|---|---|
| `/dashboard` | Dashboard | শিরোনাম "Dashboard — {workspace}", ৬টা stat card (Total Balance, This Month Income/Expense, Net, Total Savings, Total Assets), Income vs Savings bar chart (৬ মাস), সাম্প্রতিক ৫টা লেনদেন, Savings goal progress, Loan net balance, "Explore" লিংক গ্রিড, Add Transaction modal + Transfer লিংক | `dashboard/DashboardPageClient` |
| `/balance/overview` | Balance › Overview | মোট ব্যালেন্স + Account Details টেবিল (Server Component, `getLocale()` দিয়ে অনুবাদ) | page.tsx নিজেই |
| `/balance/transfer` | Balance › Balance Transfer | ট্রান্সফার ফর্ম + Transfer List | `balance/BalanceTransferPageClient` |
| `/balance/ledger` | Balance › Ledger | অ্যাকাউন্ট combobox + পিরিয়ড, Opening/In/Out/Closing, running balance টেবিল | `balance/AccountLedgerPageClient` |
| `/balance/wallet` | Balance › Wallet | Money account (Cash/Bank/MFS) তালিকা, যোগ/এডিট/মুছা; সারি → `/accounts/[id]` | `balance/WalletPageClient` |
| `/accounts` | (orphan-প্রায়) | Chart of Accounts, টাইপ অনুযায়ী গ্রুপ, archive/unarchive | `accounts/AccountsPageClient` |
| `/accounts/[id]` | Wallet সারি থেকে | অ্যাকাউন্টের সারাংশ + ledger, পিরিয়ড preset | `accounts/AccountDetailPageClient` |
| `/transactions` | Income & Expense › Transaction | ফিল্টার (search, type, account, from/to date; সব URL-এ থাকে), টেবিল (#, আইকন, তারিখ, ক্যাটাগরি, অ্যাকাউন্ট, নোট, পরিমাণ), pagination (১০/পেজ), Add Transaction modal। **শুধু Income/Expense দেখায়, Transfer নয়** | `transactions/TransactionsPageClient` |
| `/transactions/[id]` | তালিকা থেকে | Journal entry বিস্তারিত, entries টেবিল, **Void** বাটন | page.tsx + `VoidTransactionButton` |
| `/transactions/advanced` | orphan | Raw journal entry ফর্ম | page.tsx + `JournalEntryForm` |
| `/categories` | Income & Expense › Budget Planning | মাস/বছর সিলেক্টর; Expense ক্যাটাগরি (প্রতিটায় limit + progress bar, মোট বাজেট) + Income ক্যাটাগরি; আইকন/রং বাছাই সহ modal | `budget/CategoriesPageClient` |
| `/income-category` | Income & Expense › Income Category | শুধু Income ক্যাটাগরি | `budget/IncomeCategoryPageClient` |
| `/income-planning`, `/budget-planning` | — | `/categories`-এ redirect (পুরোনো bookmark) | — |
| `/assets-management/*` (dashboard, current, purchase-sell, update, category) | Assets Management | সম্পদের মোট মূল্য, তালিকা, কেনা/বেচা, মূল্য আপডেট + history, ক্যাটাগরি CRUD (`/assets-management` → dashboard redirect) | `assets/*` |
| `/savings-goals/dashboard` | Savings Goals › Dashboard | Overview + goal কার্ড (ProgressRing), যোগ/contribute/withdraw/transfer/status | `savings-goals/SavingsGoalsDashboardPageClient` |
| `/savings-goals/overview`, `/wallet`, `/transfer` | Savings Goals › … | Savings account টেবিল (Server Component), savings wallet CRUD, ট্রান্সফার + history | `savings-goals/*` |
| `/loan-management/dashboard` | Loan Management › Dashboard | দেনা/পাওনা মোট, ব্যাংক/ব্যক্তি অনুযায়ী outstanding | `loan-management/LoanDashboardPageClient` |
| `/loan-management/transactions`, `/ledger` | Loan Management › … | নতুন loan লেনদেন modal + তালিকা; contact বাছাই করে loan statement | `loan-management/*` |
| `/loan-management/bank-person-list` | orphan | LOAN contact তালিকা। **নতুন LOAN contact বানানোর একমাত্র UI**, তাই মুছা যাবে না | `loan-management/BankPersonListPageClient` |
| `/contacts`, `/contacts/[id]` | Loan Management › Contacts | Contact তালিকা + ফর্ম (ছবি আপলোড); বিস্তারিত পেজে balance detail, invoice/payment রেকর্ড, archive | `contacts/*`, `receivables-payables/*` |
| `/dena-pawna` | orphan | Receivable/Payable aging + overdue | `dena-pawna/DenaPawnaPageClient` |
| `/reports/overview` | Reports › Overview | পিরিয়ড (This Month/Last Month/This Year/Custom), Income ও Expense donut, Income vs Savings trend | `reports/ReportsOverviewPageClient` |
| `/group-expenses` | Group Expense | Group workspace তালিকা + তৈরি | `group-expenses/GroupWorkspaceListPageClient` |
| `/group-expenses/[businessId]?tab=` | Group Expense › (tab গুলো sidebar sub-item) | dashboard / members / contributions / expenses / category / settlement, **একটাই ১৩৪২ লাইনের component** | `group-expenses/GroupWorkspacePageClient` |
| `/referrals` | Referrals | রেফারেল লিংক, কীভাবে কাজ করে, আয়, সাম্প্রতিক রেফারেল, withdraw | `referrals/*` |
| `/password-manager` | Password Manager | Master password unlock gate, entry CRUD, reveal | `password-vault/*` |
| `/settings` | Settings (+ avatar মেনু) | Tab: Profile (নাম/ফোন/avatar), Security (পাসওয়ার্ড বদল, sessions, login history); App/Help/Resources "Coming soon" disabled | `settings/*` |
| `/settings/workspaces` | orphan | Workspace ম্যানেজমেন্ট | `workspace/WorkspaceSettingsPage` |

### Habit Tracker মোড (TopBar "Switch" দিয়ে, sidebar পুরো বদলে যায়)
| Route | কী আছে |
|---|---|
| `/habit-tracker` | ড্যাশবোর্ড: Namaz, Ramadan, Books, Skills, Others, To-do সারাংশ + bar chart |
| `/habit-tracker/habits?category=` | Namaz / Ramadan / Books / Skills / Others তালিকা। **Books ও Skills-এর নিজস্ব থিম** (Playfair Display, Space Grotesk ফন্ট, নিজস্ব palette) |
| `/habit-tracker/habits/{namaz,ramadan,others}/[id]` | মাসিক tracker sheet (grid); Namaz/Ramadan-এ Aref Ruqaa (আরবি ক্যালিগ্রাফি) ফন্ট |
| `/habit-tracker/todos`, `/todos/[id]` | To-do লিস্ট |

---

## ৩. স্টাইলিং পদ্ধতি

- **Tokens** (`globals.css`): `--background`, `--foreground`, `--surface`, `--content-bg`, `--brand-dark(-hover)`; `@theme inline`-এ `brand-primary #2c8655`, `brand-primary-hover`, `brand-danger #ef4444`, `brand-dark`, `brand-content`।
- **Dark mode** class-based (`.dark` on `<html>`, `@custom-variant dark`)। `localStorage.theme`-এ সংরক্ষিত, প্রথমবার OS setting অনুসরণ করে; `THEME_INIT_SCRIPT` দিয়ে flash হয় না।
  - **কৌশল:** `.dark`-এ Tailwind-এর পুরো **neutral ramp উল্টে দেওয়া হয়** (`neutral-50` ↔ `neutral-950`)। ফলে আলাদা `dark:` ক্লাস ছাড়াই বেশিরভাগ কম্পোনেন্ট dark হয়ে যায় (`dark:` মাত্র ৫৭ বার ব্যবহার হয়েছে)। নতুন semantic token (`--bg`, `--text` …) চালু করার সময় এই inversion **compatibility layer হিসেবে রাখতে হবে**, যতক্ষণ না সব পেজ migrate হয়। নাহলে পুরোনো পেজ dark-এ ভেঙে যাবে।
- **ফন্ট:** Inter (`--font-inter`) + Hind Siliguri (`--font-hind-siliguri` → `--font-bn`), `next/font/google` দিয়ে। Habit Tracker-এ আরও ৩টা (Playfair Display, Space Grotesk, Aref Ruqaa)।
- **সব স্টাইল inline Tailwind class-এ।** shared Button/Input/Card/Table নেই, প্রতিটা ফাইলে একই class বারবার লেখা: `rounded-xl` ৩৯৭ বার, `rounded-2xl` ১৩০ বার, page wrapper `h-full bg-brand-content px-6 py-8` ৩৬ বার।
- বর্তমান মাপ: h1 মূলত `text-xl` (20px, ৪১টা পেজ), কার্ড `rounded-2xl` (16px), ইনপুট/বাটন `rounded-xl` (12px)। প্ল্যানে যথাক্রমে 24px / 12px / 8px।
- Raw hex রং শুধু Habit Tracker-এর palette ফাইলে আর donut চার্টে; অন্য জায়গায় Tailwind palette (`amber`, `violet`, `emerald`… মূলত Habit Tracker-এ)। `style={{}}` ৭১ বার (বেশিরভাগ progress bar width / chart height)।

---

## ৪. i18n কীভাবে কাজ করে

**দুটো আলাদা ব্যবস্থা আছে:**

1. **সাইট-ওয়াইড (`src/lib/i18n/`):** English string নিজেই key। `t("Add Transaction")` → `bnDictionary`-তে থাকলে বাংলা, না থাকলে English।
   - Dictionary area অনুযায়ী ভাগ করা: `dictionary/*.ts` (shared, chrome, dashboard, balance, … মোট ~১৮৬০ লাইন)। **`shared.ts` সবার শেষে merge হয়**, তাই সাধারণ শব্দ সেখানে রাখতে হবে।
   - Client: `useLocale()` → `{ locale, toggleLocale, t }` (`LocaleProvider.tsx`)। Server Component: `getLocale()` + `translate(locale, key)`।
   - ভাষা থাকে `locale` cookie-তে (১ বছর); টগল করলে `router.refresh()` হয়।
   - `locale === "bn"` হলে wrapper `<div class="font-bn contents">` দিয়ে Hind Siliguri প্রয়োগ হয়, **শুধু `(dashboard)` layout-এর ভেতরে।**
   - **নতুন লেখা যোগের নিয়ম:** JSX-এ `t("English text")` লিখে ওই area-র `dictionary/<area>.ts`-এ বাংলা যোগ করতে হবে।
2. **Auth পেজ (`src/lib/authI18n.ts`):** `authDictionary.EN / .BN` key-value object; প্রতিটা ফর্মে local `useState<"EN"|"BN">("EN")`।

**সমস্যা:**
- Auth পেজের ভাষা cookie-তে সংরক্ষিত হয় না, **প্রতিবার English থেকে শুরু হয়**, আর লগইনের পর ড্যাশবোর্ডে গিয়ে সেই বাছাই থাকে না।
- Auth পেজে Hind Siliguri প্রয়োগ হয় না (বাংলা লেখা fallback system font-এ দেখায়)।
- Auth server action-এর error মেসেজ সবসময় English (`"Unable to reach the server…"`)।
- `<html lang="en">` সবসময়।
- **ইউজারের `preferredLanguage` (backend, EN/BN)** আর UI-র `locale` cookie আলাদা জিনিস। প্রথমটা শুধু Chart of Accounts-এর নামের জন্য ব্যবহার হয়।
- হার্ডকোড/অনুবাদহীন: sidebar brand "Money Tracker"/"Habit Tracker", `/dena-pawna`-এর h1, ThemeToggle-এর title, বেশিরভাগ `aria-label` ("Close", "Previous month"…), `formatDurationUntil()` (English), `formatDate()` (runtime locale), চার্টের মাসের নাম (backend `toLocaleDateString` থেকে আসে)।
- সংখ্যা কখনো বাংলা অঙ্কে দেখায় না।

---

## ৫. Auth ও data/API

- **Auth:** JWT access + refresh token **httpOnly cookie**-তে (`lib/tokenCookies.ts`)। `src/proxy.ts` প্রতিটা request-এ public path (`/login`, `/register`, `/forgot-password`, `/reset-password`) ছাড়া বাকি সব gate করে, আর মেয়াদ শেষ হওয়ার আগে token refresh করে। `(dashboard)/layout.tsx` `getCurrentUser()` (`/api/auth/me`) দিয়ে আবার চেক করে, তারপর `AuthProvider` (`useAuth()` → user, activeBusinessId, logout) আর `LocaleProvider` দেয়।
- **Browser কখনো backend-এ সরাসরি call করে না।** সব call হয় server-side থেকে:
  - Read: `src/lib/<feature>.ts` (যেমন `transactions.ts`, `accounts.ts`), React `cache()` সহ, Server Component `page.tsx` থেকে call হয়।
  - Write: `src/lib/<feature>Actions.ts` (`"use server"`), `ActionResult<T> = { success, message?, data? }` ফেরত দেয়, throw করে না। Client component এগুলো call করে `toast` দেখায় (`sonner`, ~২২৫টা toast call)।
  - Auth: `src/app/(auth)/*/_action.ts`।
- Endpoint গ্রুপ (সব `/api/...`): `auth/*`, `businesses/:id/{accounts, transactions, income, expense, transfer, budget, contacts, receivables, payables, payments, loan-management, reports, savings-goals, assets, referrals, group/*}`, `books`, `skills`, `habits`, `habit-trackers`, `todos`, `vault/*`।
- **Redesign-এর নিয়ম:** `src/lib/*.ts`, `src/lib/*Actions.ts`, `_action.ts`, `proxy.ts` আর `page.tsx`-এর data-fetch অংশ **ছোঁয়া যাবে না।** শুধু যে JSX/Client component data দেখায় সেটা বদলাবে।
- টাকার মান backend থেকে `string` হিসেবে আসে (Prisma Decimal)। Currency প্রতি workspace-এ (`BDT` ডিফল্ট, `USD`-ও আছে)।

---

## ৬. চার্ট ও বিদ্যমান UI primitives

**চার্ট (সব hand-rolled, কোনো লাইব্রেরি নেই):**
- `reports/IncomeVsSavingsChart.tsx`: div দিয়ে grouped bar; tooltip শুধু native `title`; axis/gridline নেই।
- `reports/CategoryDonutCard.tsx`: CSS `conic-gradient` donut।
- `savings-goals/ProgressRing.tsx`: conic-gradient ring।
- `habit-tracker/dashboard/DashboardBarChart.tsx`, `habit-tracker/skills/WeekChart.tsx`।

**`src/components/ui/`-এ যা আছে:** `Modal` (Esc বন্ধ করে, md/lg সাইজ, focus trap নেই), `ConfirmModal`, `Combobox` (searchable select, keyboard support), `DatePicker` (নিজস্ব ক্যালেন্ডার, অনুবাদ সহ), `PasswordInput` (দেখুন/লুকান)।
অন্য সব (Button, Input, Select, Card, StatCard, Table, Badge, Tabs, Dropdown, EmptyState) প্রতিটা পেজে আলাদা করে inline লেখা। ৫০টা native `<select>`, ১৫টা native `type="date"` (custom DatePicker-এর সাথে মিশে আছে)। ৪৮টা ফাইলে `<Modal>`।

---

## ৭. বর্তমান UI/UX সমস্যা (গুরুত্ব অনুযায়ী)

**উচ্চ**
1. মোবাইল/ট্যাবলেটে sidebar লুকায় না (§০-৪)। ট্যাবলেটে icon-only মোড নেই, collapse নেই।
2. Loading feedback নেই: সব পেজ server-render হয়, backend ধীর হলে ক্লিকের পর কিছুই বোঝা যায় না। skeleton (`animate-pulse`) ০টা।
3. Error state নেই: fetcher error-কে empty হিসেবে দেখায়; `error.tsx` নেই।
4. **টাকার ফরম্যাট:** `formatCurrency()` (`lib/currency.ts`, ১৬৩ জায়গায়) `toLocaleString(undefined)` ব্যবহার করে। ফলে (ক) lakh/crore grouping নেই (`1,250,000.00`, `12,50,000` নয়), (খ) server আর browser-এর locale আলাদা হলে ভিন্ন আউটপুট হয়, যা **hydration mismatch-এর ঝুঁকি**, (গ) সবসময় `.00` দেখায়, (ঘ) বাংলা অঙ্ক নেই, (ঙ) `৳` আর সংখ্যার মাঝে ফাঁকা নেই।
5. Auth পেজের ভাষা/ফন্ট সমস্যা (§৪)।

**মাঝারি**

6. কম্পোনেন্ট একরকম না: একই বাটন/ইনপুট/টেবিল প্রতিটা ফাইলে সামান্য ভিন্ন class দিয়ে লেখা।
7. ৯ জায়গায় `window.confirm()` (Accounts, Wallet, Savings Wallet, Asset Category, Expense/Income Category, Contact, Bank/Person, Security sessions), অথচ `ConfirmModal` আছে।
8. Focus ring অসঙ্গত: `focus-visible:` ০ বার; বাটন/লিংকে keyboard focus স্পষ্ট নয়। Modal-এ focus trap নেই।
9. TopBar-এ পেজের নাম, সার্চ, ডেস্কটপে গ্লোবাল "+ নতুন লেনদেন" কিছুই নেই (শুধু মোবাইলে FAB)। ভাষা বাটন আর "Switch" বাটন জায়গা নেয়।
10. Sidebar-এ ৯টা item/group, কোনো section heading নেই। সব group collapsible আর default বন্ধ থাকে, তাই মেনু খুঁজে পেতে ঝামেলা।
11. Typography দুর্বল: পেজ টাইটেল 20px, stat-এর অঙ্ক 20px, ছোট uppercase label।
12. চার্ট সাধারণ মানের: hover tooltip, axis, gridline নেই; মাসের নাম অনুবাদ হয় না।
13. লেনদেন টেবিল: sorting নেই, ক্যাটাগরি ফিল্টারের UI নেই (যদিও `page.tsx` `categoryId` param সমর্থন করে), ফিল্টার করা ডেটার মোট হিসাব নেই, native date input।
14. Dark mode: neutral inversion কাজ করে, কিন্তু Habit Tracker-এর amber/violet রং আর donut-এর hex dark-এ আলাদাভাবে চেক করা হয়নি।
15. Dead code (import খুঁজে পাওয়া যায়নি, Phase 8-এ নিশ্চিত হয়ে মুছা যাবে): `components/habit-tracker/HabitFormModal.tsx`, `components/workspace/WorkspaceSwitcher.tsx`, `lib/categoryDisplay.ts`।

**Scope-এর বাইরে, শুধু নোট (লজিক বাগ, redesign-এ ঠিক করা হবে না)**
- `AddTransactionModal` ও `dateRangePresets.ts`-এ `new Date().toISOString().slice(0,10)` UTC তারিখ দেয়। বাংলাদেশ সময় রাত ১২টা থেকে সকাল ৬টার মধ্যে client-side-এ আগের দিনের তারিখ বসতে পারে। Local dev (UTC+6)-এ server-side preset-ও এক দিন সরে যায়; Vercel (UTC)-এ ঠিক থাকে।

---

## ৮. প্ল্যানের সাথে অমিল ও প্রস্তাব

| প্ল্যানে | বাস্তবে | প্রস্তাব |
|---|---|---|
| Personal/Business switcher | নেই (single-workspace) | বাদ। sidebar-এর উপরে **Money ↔ Habit মোড সুইচার** রাখা যায় (এখন TopBar-এ আছে) |
| লেনদেন edit/delete, Undo | শুধু Void | সারির hover action: **দেখুন** + **Void** (detail পেজে বা ConfirmDialog দিয়ে)। Undo বাদ |
| Drawer-এ আয়/খরচ/ট্রান্সফার ট্যাব | Add modal-এ শুধু Income/Expense; Transfer আলাদা (`TransferModal`, `/balance/transfer`) | Drawer-এ তৃতীয় ট্যাব হিসেবে বিদ্যমান `TransferModal`-এর ফর্ম/action ব্যবহার করা যায় (নতুন API লাগবে না) |
| "সেভ করে আরেকটা যোগ করুন" | নেই | UI-only, করা যায় |
| অ্যাকাউন্ট/ওয়ালেট কার্ড | `/balance/wallet` (money account) + `/accounts` (Chart of Accounts) | Wallet পেজে ব্যাংক-কার্ড স্টাইল; Chart of Accounts টেবিলই থাকবে |
| ক্যাটাগরি পেজ | `/categories` = "Budget Planning" (expense limit সহ) + `/income-category` | ক্যাটাগরি কার্ড গ্রিড + বাজেট progress একসাথে এই পেজেই |
| বাজেট রং ৭০/৯০% | এখন <৭০ সবুজ, ৭০–৯৯ amber, ≥১০০ লাল (`budgetProgressColorClass`) | প্ল্যানের ৭০/৯০ মানতে হলে এই ফাংশনটা বদলাতে হবে (শুধু display logic) |
| ড্যাশবোর্ড পিরিয়ড সিলেক্টর + আগের পিরিয়ডের % তুলনা | ড্যাশবোর্ড সবসময় "this month" | `page.tsx`-এ `searchParams` + বিদ্যমান endpoint-এ **আরেকটা call** (আগের পিরিয়ড) লাগবে। API format একই থাকবে, কিন্তু data-fetch বদলাবে, তাই **ইউজারের অনুমতি দরকার** |
| সঞ্চয় = আয় − খরচ | ড্যাশবোর্ডে "Net This Month" + আলাদা "Total Savings" (Savings Goals থেকে) | দুটোই রাখা; লেবেল পরিষ্কার করা |
| DataTable bulk select | কোনো bulk API নেই | বাদ |
| CSV/Excel export | নেই | বর্তমান পেজের ডেটা থেকে client-side CSV করা যায়, তবে এটা নতুন ফিচার, **Phase 9** |
| Recharts | কোনো চার্ট লাইব্রেরি নেই | নতুন dependency (~৯০ KB gz) বনাম hand-rolled চার্ট নতুন করে স্টাইল করা। **ইউজারের সিদ্ধান্ত** |
| `formatMoney()` | `formatCurrency(amount, currencyCode)` আছে, ১৬৩ জায়গায় ব্যবহার | নাম না বদলে এটাকেই উন্নত করা (explicit `en-IN`/`bn-BD` locale, lakh grouping, বাংলা অঙ্ক অপশন, `৳ ` ফাঁকা)। দরকার হলে `formatMoney` alias |
| Ctrl+K সার্চ | global search API নেই | শুধু পেজ/অ্যাকশন নেভিগেশন palette (Phase 9) |
| সেটিংস: ভাষা/থিম/মুদ্রা | Profile + Security tab; থিম/ভাষা TopBar-এ | "পছন্দ" tab যোগ করে সেখানে বিদ্যমান থিম/ভাষা টগল। মুদ্রা workspace-এর অংশ, সেটা `/settings/workspaces`-এ আছে |
| `/dev/components` | — | Phase 2-এ; production-এ `notFound()` |
| "main এ merge করলে আসল সাইট" | user-frontend-এর production = local `main` → `origin/user-frontend` | শেষে `redesign` → local `main` merge, তারপর `git push` (→ `origin/user-frontend`)। **`origin/main`-এ কখনো নয়** |

---

## ৯. Phase ভাগের প্রস্তাব (আকার অনুযায়ী)

- **Phase 7a:** Balance (overview, transfer, ledger, wallet) + Chart of Accounts
- **Phase 7b:** Budget Planning/ক্যাটাগরি + Reports
- **Phase 7c:** Savings Goals + Assets Management
- **Phase 7d:** Loan Management + Contacts + Dena-Pawna
- **Phase 7e:** Group Expense (১৩৪২ লাইনের component, আলাদা session)
- **Phase 7f:** Settings, Referrals, Password Manager, Workspaces
- **Phase 7g:** Habit Tracker (সিদ্ধান্ত সাপেক্ষে, §১০)

---

## ১০. ইউজারের সিদ্ধান্ত দরকার

1. **Brand রং:** প্ল্যানের indigo, নাকি বর্তমান green রাখা (admin-frontend-এর সাথে মিল রাখতে)?
2. **Habit Tracker:** পুরো redesign, নাকি শুধু নতুন shell/token (Books/Skills-এর নিজস্ব থিম রেখে)?
3. **Recharts** যোগ করা হবে, নাকি বিদ্যমান hand-rolled চার্ট নতুন স্টাইলে?
4. **Orphan পেজ** (`/dena-pawna`, `/loan-management/bank-person-list`, `/transactions/advanced`, `/settings/workspaces`, `/choose-workspace`): redesign-এ রাখা হবে, নাকি যেমন আছে তেমন?
5. ড্যাশবোর্ডের **পিরিয়ড সিলেক্টর ও % তুলনার** জন্য বিদ্যমান endpoint-এ অতিরিক্ত call করা যাবে কি?
6. বাজেট রঙের সীমা ৭০/৯০% (প্ল্যান) নাকি ৭০/১০০% (বর্তমান)?
