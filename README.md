# Cashfo web

One site for everyone who signs in. Admins get the admin panel under `/admin`: users and workspaces, subscriptions and payments, content, support, notifications, security and system tooling. Customers sign up, sign in and reset their password on the same pages, and land in the customer app (its money-management screens are moving in from the `user-frontend` branch). It talks to the NestJS backend (`cashfo_backend`).

## Stack

Next.js 16 (App Router, `proxy.ts`) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui (`radix-maia`, lucide icons) · TanStack Query, Form and Table · zod v4 · axios (server-side only) · recharts · sonner · `@date-fns/tz`.

## Getting started

```bash
npm install
cp .env.example .env.local   # point API_BASE_URL at the backend
npm run dev                  # http://localhost:3000/login
```

The backend must be running (default `http://localhost:5000`). Sign in with an admin or a customer account from the backend seed, or create a customer at `/register`.

| Script | What it does |
|---|---|
| `npm run dev` | Dev server (`next dev --webpack`) |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint (Next, React Compiler and TanStack Query rules) |
| `npm run typecheck` | Route types (`next typegen`), then `tsc --noEmit` |
| `npm test` | Unit tests -- see [TESTING.md](TESTING.md) |

## How the code is organised

```
src/
  app/                         routes only: page.tsx, layout.tsx, loading.tsx, _action.ts
    (auth)/{login,register,forgot-password,reset-password}/
    (dashboardLayout)/admin/<area>/   the admin panel
    (customerLayout)/dashboard/       the customer app
    -actions/                  actions not tied to one route (logout, error reports)
  components/
    ui/                        shadcn primitives (generated -- add with `npx shadcn add`)
    shared/                    app-wide building blocks: DataTable, form fields, dialogs, charts, cells
    modules/Admin/<Area>/      feature components
    modules/Auth/              the sign-in, sign-up and password-reset pages
    modules/Customer/          the customer app
  services/                    "use server" API calls through httpClient
  queries/                     TanStack Query options (one queryKey per call)
  types/                       API response and payload types
  zod/                         form + server schemas (with tests)
  hooks/                       useServerDataTable, useActionMutation, useRowDialogs, ...
  lib/                         httpClient, auth/role helpers, formatters, query-string builders
  proxy.ts                     auth gate, token refresh, routing by side and role
```

### The layering rule

`component → _action.ts → service → httpClient`

- **Services** (`services/*.services.ts`, `"use server"`) are thin API calls. They log and rethrow on failure.
- **Actions** (`_action.ts` beside the page) re-validate input with the server zod schema and **never throw** -- they always return `{ success, message, data }` (see `lib/runAction.ts`). Components never need a try/catch.
- **Components** never import `httpClient`. Reads go through TanStack Query (`queries/*`); writes through `useActionMutation`, which toasts, invalidates the affected query keys and returns `true` on success.
- **Pages** are Server Components: they prefetch with `QueryPrefetch` so the client tables render with data on first paint.

### Tables

Every list uses the shared `DataTable` (`components/shared/table`): sorting, faceted and date-range filters, search, column visibility (remembered per browser), CSV export, row selection, row actions, sticky header, skeleton and empty states, and tree rows (`getSubRows`).

- **Server-paginated** lists use `useServerDataTable(config)`: the URL is the source of truth (`?page=&limit=&search=&status=...`), updated with `history.pushState`, and the same config builds the page's prefetch query string.
- **Short lists** (plans, coupons, categories, ...) are filtered, sorted and paged in memory.

### Signing in

There is one sign-in page, `/login`, for admins and customers alike; the account's role decides where it lands. The backend runs [better-auth](https://www.better-auth.com); this app never talks to it from the browser except for Google.

- **Email and password** -- the login Server Action calls `POST /api/auth/sign-in`. better-auth checks the password and opens a session; the backend answers with an access/refresh token pair bound to that session (`sid`) and says which side it is for (`audience`, also in each token as `aud`). The pair is stored as httpOnly cookies and the browser goes to `?redirect=` if that side and role may open it (`isValidRedirect`), otherwise to `/admin/dashboard` or `/dashboard`. `proxy.ts` refreshes the access token on its own side before it expires. Logging out ends the session on the backend, so both tokens stop working at once.
- **Continue with Google** -- the button posts to `/api/auth/sign-in/social`, which `app/api/auth/[...all]/route.ts` forwards to the backend (only better-auth's public endpoints pass, see `lib/betterAuthRoutes.ts`). Google returns to `/api/auth/callback/google` on this origin, better-auth sets its session cookie and sends the browser to `/login/google`, which exchanges that session (`POST /api/auth/session/sign-in`) for the same token pair. A Google address with no account becomes a customer account (`requestSignUp`); an admin's own address signs them in to the admin panel.
- **Sign up** (`/register`) creates a customer account, with its first workspace, in the page's language, and signs it straight in. A `?ref=` invite code is passed on.
- **Forgot password** (`/forgot-password`) mails customers a link to `/reset-password?token=...`; using it signs them in here and out everywhere else. Admin passwords are reset by a super admin.

The old `/admin/login` URLs redirect to `/login` (`next.config.ts`), query string and all.

Google needs, on the OAuth client, the redirect URI `<site>/api/auth/callback/google` (locally `http://localhost:3000/api/auth/callback/google`), and on the backend `BETTER_AUTH_URL` set to this site's origin plus `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`.

Every backend call carries the visitor's `X-Forwarded-For` and `User-Agent` (`lib/axios/clientHeaders.ts`), so the login throttle, login history and session records see the real client, not this server.

### Roles

`proxy.ts` sends visitors without a session to `/login`, keeps admins in `/admin` and customers out of it, and keeps admins out of areas their role can't open (Security and System are SUPER_ADMIN only). Inside a page, `canManage(role, area)` (`lib/authUtils.ts`) decides whether edit controls show; the backend enforces the same rules.

### Dates

All dates render and filter in the platform timezone (`NEXT_PUBLIC_APP_TIME_ZONE`, default `Asia/Dhaka`) through `lib/date.ts`, so server and browser always agree and "today" means Bangladesh's today.

## Adding a feature

1. `types/<feature>.types.ts` -- response and payload types.
2. `zod/<feature>.validation.ts` -- a form schema and a server schema, plus a `.test.ts`.
3. `services/<feature>.services.ts` -- `"use server"` calls through `httpClient`.
4. `queries/<feature>.queries.ts` -- `queryOptions` keyed through `lib/queryKeys.ts`.
5. `app/(dashboardLayout)/admin/<route>/_action.ts` -- one-line actions over `runValidatedAction`.
6. `components/modules/Admin/<Area>/` -- columns, table, forms, dialogs.
7. `page.tsx` (prefetch + render) and `loading.tsx`; add the route to `lib/navItem.ts`.

## Deploying

`main` is the live site, `smartly.softech.agency`. Every pull request runs CI (`.github/workflows/ci.yml`: lint, typecheck, tests, build, Docker image); a merge to `main` publishes `ghcr.io/arifur999/cashfo`, and the VPS pulls it within two minutes and rolls back if it doesn't come up healthy. The server side -- compose stack, nginx, release agent, backups -- lives in the backend repo: `cashfo_backend/deploy/README.md`.
