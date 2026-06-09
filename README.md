# CampusHub

CampusHub is a multi-tenant university ecosystem SaaS foundation built with Next.js App Router, TypeScript, Tailwind CSS, Prisma, Better Auth, Zustand, TanStack Query, React Hook Form, Zod, and Lucide Icons.

This repository currently contains only the platform foundation. It intentionally does not include public website pages, auth pages, onboarding screens, dashboards, or university business modules.

## Architecture

```txt
src/
  app/                 App Router root, route groups, API handlers
  components/          Shared UI, layout, navigation, feedback components
  features/            Feature foundations by domain
  hooks/               Shared React hooks
  lib/                 Cross-cutting libraries and framework adapters
  providers/           Global React providers
  store/               Zustand stores
  types/               Shared TypeScript types
  config/              App and environment configuration
  services/            Service-layer patterns
  constants/           Shared constants
  styles/              Global styles and theme tokens
```

## Route Groups

The App Router contains layout-only route groups:

```txt
src/app/
  (app)/
  (public)/
  (auth)/
  (onboarding)/
  (portal)/
  (dashboard)/
```

Pages are intentionally not implemented yet.

## Foundation Areas

- Theme system with light, dark, system preference, CSS tokens, and Zustand persistence.
- Global providers for theme, TanStack Query, Better Auth session context, tenant context, and toast rendering.
- Better Auth server/client setup with an auth route handler at `src/app/api/auth/[...all]/route.ts`.
- RBAC definitions for platform and tenant roles, permission mappings, and helper utilities.
- Tenant context, tenant types, tenant header utilities, and middleware architecture.
- Prisma foundation for `University`, `Role`, `User`, and `Session`.
- API response utilities, API error helpers, and a base service pattern for future modules.
- Shared UI primitives for containers, cards, data tables, empty/loading/error states, modals, drawers, and confirmations.
- Navigation shell components for sidebar, topbar, search, user menu, and notification menu.

## Verification

```bash
npm run prisma:generate
npm run lint
npm run typecheck
npm run build
```

## Environment

Copy `.env.example` to `.env` and replace all secret/database values before running migrations or deploying.
