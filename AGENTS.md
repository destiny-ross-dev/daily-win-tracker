# AGENTS.md

This repo uses AI-assisted development (Codex). This file defines how the agent should work: scope, standards, guardrails, and the project workflow.

## Project summary

**Stack**

- Frontend: Next.js (Create Next App defaults), TypeScript, TailwindCSS, App Router
- Backend: Supabase (Postgres, Auth, Realtime)
- Auth approach: Client-side (no Supabase SSR/Auth helpers)

**Primary goals**

- Build a clean, fast, accessible web app for daily sales execution + tracking.
- Keep implementation maintainable: typed data access, small components, predictable state.

## How the agent should work

### Default behavior

- Prefer **small, reviewable changes** over big rewrites.
- Keep changes **scoped to the request**. No “while I’m here” refactors unless requested.
- If there are multiple valid approaches, choose the simplest and briefly note tradeoffs.

### Before coding

- Identify the _exact_ files likely involved.
- If requirements are ambiguous, make a reasonable assumption and proceed, but **document the assumption** in the response.

### While coding

- Follow existing conventions in the repo (naming, file structure, Tailwind patterns).
- Use TypeScript intentionally (avoid `any` unless unavoidable).
- Keep UI accessible (labels, focus states, keyboard navigation, aria where needed).
- Prefer server components by default; use `"use client"` only when required.

### After coding

Provide:

- What changed (high level)
- Which files changed
- How to run checks locally (commands)
- Any follow-ups / TODOs (short)

## Repo structure (expected)

- `app/` routes, layouts, server actions
- `components/` shared UI components
- `lib/` utilities, Supabase client, helpers
- `types/` shared types (optional)

## Development commands

Use these unless the repo says otherwise:

- `npm run dev`
- `npm run build`
- `npm run lint`

If a `typecheck` script exists, run it; otherwise keep TS errors at zero.

## Supabase conventions (client-side auth)

### Client setup

This project uses **client-side Supabase** (no SSR helpers).

- Create a single browser client in `lib/supabase/client.ts`.
- Never instantiate the client repeatedly inside components—import the shared one.

Environment variables (in `.env.local`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Never expose server keys (no `SERVICE_ROLE` usage in the browser).

### Auth/session handling

- Use `supabase.auth.getSession()` on app init and listen with `onAuthStateChange`.
- Store session/user state in a small client provider (e.g., `components/providers/AuthProvider.tsx`).
- Auth-gated routes should handle:
  - Loading state
  - Logged-out state (redirect or show login)
  - Error state

### Realtime

- Subscribe only where it provides clear value.
- Always clean up subscriptions on unmount (unsubscribe).
- Avoid duplicate subscriptions by scoping them to a single component/provider.

Recommended realtime targets (when applicable):

- `daily_goals` (today’s goals updates)
- `daily_activities` (today’s activity counts)
- `daily_appointments` (today’s schedule)
- `quotes_sales` (today’s quoting/writing/issuing activity)

`profiles` / `agencies` are typically not realtime-critical.

## Database schema (source of truth)

Tables:

- `profiles`
  - `id` references `auth.users.id`
  - `agency_id` references `agencies.id`
  - `first_name`, `last_name`, `email`, `role`, `is_active`, `created_at`, `updated_at`
- `agencies`
  - `id`, `name`, `address1`, `address2`, `city`, `state`, `zip`, `created_at`, `updated_at`
- `daily_goals`
  - `id`, `user_id` references `auth.users.id`
  - `date`
  - `auto_quotes`, `fire_quotes`, `life_quotes`, `health_quotes`
  - `auto_sales`, `fire_sales`, `life_sales`, `health_sales`
  - `reviews`, `referrals`
  - `created_at`, `updated_at`
- `daily_activities`
  - `id`, `user_id` references `auth.users.id`
  - `date`
  - `no_answer_count`, `bad_contact_count`, `not_interested_count`
  - `callback_scheduled`
  - `quoted_callback_scheduled_count`, `quoted_lost_count`, `sales_count`
  - `created_at`, `updated_at`
- `daily_appointments`
  - `id`, `user_id` references `auth.users.id`
  - `datetime`
  - `policyholder`,
  - `created_at`, `updated_at`
- `quotes_sales`
  - `id`, `user_id` references `auth.users.id`
  - `policyholder`, `lob`, `policy_type`, `zipcode`
  - `quoted_date`, `quoted_premium`
  - `written_date`, `written_premium`
  - `issued_date`, `issued_premium`,
  - `created_at`, `updated_at`

### Data rules & assumptions

- Rows are generally **owned by `user_id`** (except `agencies`).
- `profiles.agency_id` defines tenant membership; many features should be scoped to the user’s agency.
- `profiles.is_active=false` should behave like a soft-disable for access.

If an implementation depends on details not listed (e.g., date columns for daily tables), the agent should:

- Make a minimal assumption (e.g., “one row per day per user”), and
- Call out the assumption explicitly.

## RLS & security expectations

Assume RLS (Row Level Security) is enabled and required.

- Never rely on client-side filtering alone for access control.
- For user-owned tables (`*_goals`, `*_activities`, `*_appointments`, `quotes_sales`), policies should restrict access to:
  - `auth.uid() = user_id` (baseline), OR
  - Agency-scoped access if role permits (e.g., managers can see all agents in same agency)

The agent should not invent policies unless asked, but should flag when a feature requires them.

## Type safety

- Prefer generated Supabase types if present (e.g., `Database` types).
- If types are not generated yet, define minimal local types in `types/` and expand incrementally.
- Avoid “stringly-typed” LOB/policy fields if easy to constrain:
  - Example: `lob` could be a union like `"auto" | "fire" | "life" | "health"` (only if consistent with DB values).

## UI & styling rules (Tailwind-only)

- Tailwind-first. Avoid custom CSS unless Tailwind becomes genuinely painful.
- Components should be small and composable.
- Use semantic HTML and accessible form patterns:
  - Inputs have labels
  - Errors are readable
  - Focus states are visible
- Keep layout consistent: spacing scale, typography, and responsive behavior.

## Working style for tasks

When implementing a feature:

1. Build the minimal viable version with clean types and basic UX states.
2. Add realtime only where it meaningfully improves the experience.
3. Note follow-ups (edge cases, migrations, RLS needs) in a short TODO list.

When debugging:

1. Reproduce mentally using provided logs/snippets.
2. Identify likely root cause(s).
3. Apply the smallest fix first.
4. Add minimal diagnostics only when necessary.

## “Stop and ask” triggers

Ask for clarification (or make a clearly-labeled assumption) if:

- Agency scoping vs per-user scoping is unclear for a feature.
- Roles/permissions are required (manager vs agent vs admin behavior).
- Realtime scope is unclear (which tables/events should update which UI).
- The intended “daily” model is unclear (one row per day? how is the date stored?).

## Notes to keep updated

As the project evolves, update this file with:

- Final auth flow (magic link, email/password, SSO)
- Canonical date model for daily tables
- Role definitions + permission rules
- Any shared UI patterns (forms, tables, cards, modals)
