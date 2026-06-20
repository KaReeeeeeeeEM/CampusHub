# CampusHub Bug Tracker

## Critical

No open critical bugs recorded in this stabilization pass.

## High

### CH-QA-005

- **Severity:** High
- **Description:** Legacy role experience components still import `mock-data.ts` modules and are not fully backed by live database services.
- **Location:** `src/features/student-portal`, `src/features/teacher-portal`, `src/features/alumni-portal`, `src/features/employer-portal`, `src/features/committee-member`, `src/features/showcase`, `src/features/campus-market`
- **Root Cause:** Earlier UI-first portal components were implemented as self-contained experiences before backend integration was complete.
- **Resolution:** Pending. Replace each remaining mock module import with role-scoped service queries or API-backed client state, preserving empty states when collections are empty.
- **Status:** Open

### CH-QA-006

- **Severity:** High
- **Description:** Some role profile headers still use local fallback profile objects instead of the authenticated user and related university/college/department records.
- **Location:** `src/features/student-portal/components/student-experience.tsx`, `src/features/teacher-portal/components/teacher-experience.tsx`, `src/features/alumni-portal/components/alumni-experience.tsx`, `src/features/employer-portal/components/employer-experience.tsx`, `src/features/committee-member/components/committee-topbar.tsx`
- **Root Cause:** The UI phase used static profile context to render complete role screens.
- **Resolution:** Pending. Source profile context from `requireAuth()`/`useAuth()` and backend profile services, then show incomplete-profile empty states where records are missing.
- **Status:** Open

## Medium

### CH-QA-007

- **Severity:** Medium
- **Description:** Public marketing pages contain static content arrays. These are not database records, but they should be reviewed for product/content ownership before real-world testing.
- **Location:** `src/app/(public)/about/page.tsx`, `src/app/(public)/features/page.tsx`, `src/app/(public)/alumni/page.tsx`
- **Root Cause:** Public website content is maintained as static copy in page components.
- **Resolution:** Pending content decision. Leave static marketing copy if it is approved product content; move to CMS/database only if campus operators need to manage it.
- **Status:** Open

### CH-QA-008

- **Severity:** Medium
- **Description:** Default badge and achievement service functions still exist as internal functions, although their public seed endpoints are disabled.
- **Location:** `src/features/gamification/lib/badge-service.ts`, `src/features/gamification/lib/achievement-service.ts`
- **Root Cause:** Earlier gamification implementation included helper functions to create starter records.
- **Resolution:** Public API access has been disabled. Remove or convert the helpers to explicit admin CRUD/migration workflows in a follow-up cleanup.
- **Status:** Open

## Low

### CH-QA-009

- **Severity:** Low
- **Description:** Several form placeholders use realistic sample values.
- **Location:** Multiple create/edit forms across admin, marketplace, showcase, employer, and onboarding modules.
- **Root Cause:** Placeholders are instructional UI text, not persisted records.
- **Resolution:** Pending product copy review. Keep if accepted as guidance; revise to generic examples if QA considers sample copy misleading.
- **Status:** Open

## Fixed

### CH-QA-001

- **Severity:** Critical
- **Description:** Super Admin could be created through a seed script instead of the controlled first-run bootstrap flow.
- **Location:** `package.json`, `scripts/seed-super-admin.mjs`
- **Root Cause:** Legacy seed command remained after bootstrap requirements were introduced.
- **Resolution:** Removed the `seed:super-admin` npm script and deleted `scripts/seed-super-admin.mjs`. The `/bootstrap` flow is now the supported first Super Admin creation path.
- **Status:** Fixed

### CH-QA-002

- **Severity:** High
- **Description:** Default badge and achievement endpoints could seed records through API calls.
- **Location:** `src/app/api/badges/defaults/route.ts`, `src/app/api/achievements/defaults/route.ts`
- **Root Cause:** Gamification defaults were exposed as creation endpoints.
- **Resolution:** Replaced endpoint behavior with `410 Gone` responses explaining that default seeding is disabled during stabilization.
- **Status:** Fixed

### CH-QA-003

- **Severity:** High
- **Description:** Student dashboard quick action linked to a missing route.
- **Location:** `src/features/student-dashboard/lib/mock-data.ts`
- **Root Cause:** The quick action used `/student/campus-map`, while the implemented page is `/student/map`.
- **Resolution:** Updated the quick action href to `/student/map`.
- **Status:** Fixed

### CH-QA-004

- **Severity:** Medium
- **Description:** Student dashboard sections rendered blank containers or mock-oriented copy when no data existed.
- **Location:** `src/features/student-dashboard/components/dashboard-widgets.tsx`, `src/components/navigation/notification-menu.tsx`
- **Root Cause:** Empty arrays were rendered without consistent explanatory empty states, and shared notification menu used placeholder wording.
- **Resolution:** Added explicit empty states for upcoming events, almanac highlights, campus landmarks, and notifications. Replaced mock-oriented copy with live-record messaging.
- **Status:** Fixed

### CH-QA-010

- **Severity:** High
- **Description:** First-run Super Admin setup was missing before this stabilization pass.
- **Location:** `src/app/bootstrap/page.tsx`, `src/app/api/bootstrap/super-admin/route.ts`, `src/features/bootstrap`
- **Root Cause:** Initial admin creation previously depended on an environment-backed seed script.
- **Resolution:** Added a guarded `/bootstrap` screen and API with one-time lock semantics. `/login` redirects to `/bootstrap` while no Super Admin exists, and `/bootstrap` redirects back to `/login` after bootstrap is disabled.
- **Status:** Fixed

### CH-QA-011

- **Severity:** Low
- **Description:** ESLint reported three `@next/next/no-img-element` warnings in legacy alumni and employer portal components.
- **Location:** `src/features/alumni-portal/components/alumni-experience.tsx`, `src/features/employer-portal/components/employer-experience.tsx`
- **Root Cause:** Older portal components rendered raw `<img>` tags instead of `next/image`.
- **Resolution:** Replaced the remaining raw image tags with `next/image` using stable relative containers and responsive `sizes` values.
- **Status:** Fixed

### CH-QA-012

- **Severity:** Low
- **Description:** Bootstrap lock completion could store the lock identifier as `createdUserId` when bootstrap was disabled by a race-condition recheck.
- **Location:** `src/features/bootstrap/lib/bootstrap-service.ts`
- **Root Cause:** The lock completion helper required a user id even for disablement paths where the current request did not create the user.
- **Resolution:** Made lock completion metadata optional and only writes `createdUserId` after a real Super Admin user is created.
- **Status:** Fixed

### CH-QA-013

- **Severity:** Critical
- **Description:** Production build failed because the public alumni page and alumni portal index both resolved to `/alumni`.
- **Location:** `src/app/(public)/alumni/page.tsx`, `src/app/(alumni)/alumni/page.tsx`
- **Root Cause:** Route groups do not affect the URL path, so both pages created the same route.
- **Resolution:** Removed the redundant protected alumni portal index redirect. Public `/alumni` remains available, and authenticated alumni portal pages remain available under `/alumni/dashboard` and sibling routes.
- **Status:** Fixed

### CH-QA-014

- **Severity:** High
- **Description:** Production build failed while prerendering `/showcase` when showcase leaderboard data was empty.
- **Location:** `src/features/showcase/components/showcase-experience.tsx`, `src/features/showcase/lib/mock-data.ts`
- **Root Cause:** Public showcase leaderboards expected populated mock structures and mapped undefined arrays after dummy records were removed.
- **Resolution:** Added missing empty leaderboard collections, explicit empty states for public projects and leaderboards, and safe array defaults in the project details sheet.
- **Status:** Fixed

### CH-QA-015

- **Severity:** Low
- **Description:** Production build emitted duplicate Mongoose index warnings.
- **Location:** `src/lib/db/models/auth-identity.ts`, `src/lib/db/models/alumni.ts`, `src/lib/db/models/mentorship.ts`, `src/lib/db/models/opportunities.ts`, `src/lib/db/models/communication.ts`, `src/lib/db/models/university.ts`
- **Root Cause:** Several schema fields used inline `index: true` while also defining equivalent explicit unique or TTL indexes.
- **Resolution:** Removed only the duplicate inline indexes and preserved the explicit unique, compound, and TTL index definitions.
- **Status:** Fixed

### CH-QA-016

- **Severity:** High
- **Description:** Logging out could redirect back into the authenticated portal flow and leave app session state visible.
- **Location:** `src/lib/auth/middleware.ts`, `src/lib/auth/client.ts`, `src/components/navigation/user-menu.tsx`
- **Root Cause:** Middleware treated any cookie containing `campushub` as an auth session, so persisted UI cookies could be mistaken for a valid session after logout. The client auth base URL was also fixed to `NEXT_PUBLIC_APP_URL`, which is fragile when local host/port differs from the active browser origin.
- **Resolution:** Middleware now recognizes only Better Auth session-token cookies. Logout now uses same-origin auth requests, clears client user and portal-selection state, removes the dev role preview cookie, and navigates to `/`.
- **Status:** Fixed

### CH-QA-017

- **Severity:** High
- **Description:** Live login redirected users to the development-oriented portal selection screen instead of their role dashboard.
- **Location:** `src/constants/routes.ts`, `src/lib/auth/role-redirect.ts`, `src/app/(app)/dashboard/page.tsx`, `src/app/(portal)/portal-selection/page.tsx`, `src/lib/auth/redirects.ts`
- **Root Cause:** The default authenticated redirect still pointed to `/portal-selection`, and the login callback inherited that default.
- **Resolution:** Replaced the default authenticated destination with `/dashboard`, added a server-side role landing resolver, redirected legacy `/portal-selection` requests to the role landing path, and updated stale links/callback sanitization away from the portal picker.
- **Status:** Fixed
