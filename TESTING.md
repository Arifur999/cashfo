# Testing

## Unit tests

```bash
npm test             # run once
npm run test:watch   # re-run on change
```

Tests are [Vitest](https://vitest.dev) files next to the code they cover (`*.test.ts` under `src/`). Vitest runs through `npx` on purpose -- it isn't a project dependency, so it adds nothing to installs or the production build. `vitest.config.mts` sets the node environment and the `@/` alias.

They cover pure logic only, where most of the rules live:

- **zod schemas** (`src/zod/*.test.ts`) -- what each form accepts, how values are trimmed and coerced into the API payload, cross-field rules (refund limits, schedules, coupon validity).
- **Formatting and dates** (`src/lib/*.test.ts`) -- currency, numbers, durations, timezone-correct day boundaries and datetime inputs.
- **Query strings and tables** -- `buildQueryString` whitelisting, CSV escaping and formula-injection guards, the pagination window, faceted filtering.
- **Feature helpers** -- audit diffs, template placeholders, analytics date ranges, campaign audiences, linked-account options.

Components aren't unit-tested; their behaviour is covered end to end in the browser.

## Typecheck and lint

```bash
npm run typecheck   # next typegen (route types like PageProps), then tsc --noEmit
npm run lint
```

Both should be clean before a commit, and CI runs both on every pull request. Plain `npx tsc --noEmit` only works once `next dev` or `next build` has generated the route types.

## End-to-end checks

Each feature was verified in a real browser against the local backend: its main flows (create, edit, filter, paginate, dialogs, optimistic updates) with the console watched for errors and hydration warnings. When doing the same:

- Sign in once and reuse the session -- the backend allows only 5 logins per 15 minutes per IP.
- Name test records with an `E2E` prefix and delete them afterwards.
