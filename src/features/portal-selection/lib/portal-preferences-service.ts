import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  isLegacyStudentLeadershipRoleKey,
  isRoleKey,
  isStudentLeadershipPosition,
  type RoleKey,
} from "@/features/authorization/roles";
import {
  DEV_ROLE_PREVIEW_COOKIE,
  isRolePreviewKey,
} from "@/features/development/role-preview";
import {
  canAccessPortal,
  getPortalByKey,
  isPortalKey,
  portalDefinitions,
  type PortalKey,
} from "@/features/portal-selection/lib/portals";
import { requireCompletedOnboarding } from "@/lib/auth/route-guards";
import { connectMongo } from "@/lib/db/mongodb";
import {
  PortalPreferenceModel,
  UserModel,
  type PortalPreferenceDocument,
} from "@/lib/db/models";
import type { AuthSession } from "@/types/auth";

const quickAccessLimit = 3;

export type PortalPreferenceState = {
  availablePortals: PortalKey[];
  defaultPortal: PortalKey | null;
  lastUsedPortal: PortalKey | null;
  quickAccess: PortalKey[];
  selectedPortal: PortalKey | null;
  selectedAt: string | null;
  recommendedPortal: PortalKey | null;
};

type PreferenceInput = Partial<PortalPreferenceDocument> | null | undefined;

export class PortalAccessError extends Error {
  status = 403;

  constructor(message = "You do not have access to this portal.") {
    super(message);
    this.name = "PortalAccessError";
  }
}

export function resolveUserRoles(session: AuthSession) {
  const roles = session.user.roles?.length
    ? session.user.roles
    : [session.user.role];

  return Array.from(
    new Set(roles.filter(isRoleKey)),
  );
}

export function resolveStudentLeadershipPositions(session: AuthSession) {
  const explicitPositions =
    session.user.studentLeadershipPositions?.filter(
      isStudentLeadershipPosition,
    ) ?? [];
  const legacyPositions =
    session.user.roles
      ?.filter(isLegacyStudentLeadershipRoleKey)
      .filter(isStudentLeadershipPosition) ?? [];

  return Array.from(new Set([...explicitPositions, ...legacyPositions]));
}

async function resolvePreviewableAccess(session: AuthSession) {
  const roles = resolveUserRoles(session);
  const studentLeadershipPositions = resolveStudentLeadershipPositions(session);

  if (
    process.env.NODE_ENV === "production" ||
    !roles.includes("SUPER_ADMIN")
  ) {
    return { roles, studentLeadershipPositions };
  }

  const previewRole = (await cookies()).get(DEV_ROLE_PREVIEW_COOKIE)?.value;

  if (!isRolePreviewKey(previewRole)) {
    return { roles, studentLeadershipPositions };
  }

  if (isStudentLeadershipPosition(previewRole)) {
    return {
      roles: ["STUDENT"] satisfies RoleKey[],
      studentLeadershipPositions: [previewRole],
    };
  }

  return { roles: [previewRole], studentLeadershipPositions: [] };
}

export function getAvailablePortalsForAccess(userRoles: RoleKey[]) {
  return portalDefinitions
    .filter((portal) => canAccessPortal(userRoles, portal))
    .map((portal) => portal.key);
}

function firstAccessiblePortal(
  candidates: Array<PortalKey | null | undefined>,
  availablePortals: PortalKey[],
) {
  return (
    candidates.find(
      (portal): portal is PortalKey =>
        isPortalKey(portal) && availablePortals.includes(portal),
    ) ?? null
  );
}

function sanitizePortal(value: unknown) {
  return isPortalKey(value) ? value : null;
}

function sanitizeQuickAccess(
  quickAccess: unknown,
  availablePortals: PortalKey[],
  fallbackPortal: PortalKey | null,
) {
  const portals = Array.isArray(quickAccess)
    ? quickAccess.filter(
        (portal): portal is PortalKey =>
          isPortalKey(portal) && availablePortals.includes(portal),
      )
    : [];

  const uniquePortals = Array.from(new Set(portals)).slice(0, quickAccessLimit);

  if (uniquePortals.length > 0) {
    return uniquePortals;
  }

  return fallbackPortal ? [fallbackPortal] : [];
}

function serializePreferenceState(
  preference: PreferenceInput,
  availablePortals: PortalKey[],
): PortalPreferenceState {
  const defaultPortal = firstAccessiblePortal(
    [
      sanitizePortal(preference?.defaultPortal),
      sanitizePortal(preference?.lastUsedPortal),
    ],
    availablePortals,
  );
  const recommendedPortal = defaultPortal ?? availablePortals[0] ?? null;
  const lastUsedPortal = firstAccessiblePortal(
    [sanitizePortal(preference?.lastUsedPortal)],
    availablePortals,
  );
  const selectedPortal = firstAccessiblePortal(
    [sanitizePortal(preference?.selectedPortal)],
    availablePortals,
  );

  return {
    availablePortals,
    defaultPortal: defaultPortal ?? recommendedPortal,
    lastUsedPortal,
    quickAccess: sanitizeQuickAccess(
      preference?.quickAccess,
      availablePortals,
      recommendedPortal,
    ),
    selectedPortal,
    selectedAt: preference?.selectedAt
      ? new Date(preference.selectedAt).toISOString()
      : null,
    recommendedPortal,
  };
}

async function getOrCreatePortalPreference(session: AuthSession) {
  await connectMongo();

  const { roles } = await resolvePreviewableAccess(session);
  const availablePortals = getAvailablePortalsForAccess(roles);
  const fallbackPortal = availablePortals[0] ?? null;

  const preference = await PortalPreferenceModel.findOneAndUpdate(
    { userId: session.user.id },
    {
      $setOnInsert: {
        _id: randomUUID(),
        userId: session.user.id,
        defaultPortal: fallbackPortal,
        quickAccess: fallbackPortal ? [fallbackPortal] : [],
        lastUsedPortal: null,
        selectedPortal: null,
        selectedAt: null,
      },
    },
    { new: true, upsert: true },
  ).lean<PortalPreferenceDocument>();

  const state = serializePreferenceState(preference, availablePortals);

  const persistedDefaultPortal = preference?.defaultPortal ?? null;
  const persistedQuickAccess = preference?.quickAccess ?? [];

  if (
    persistedDefaultPortal !== state.defaultPortal ||
    JSON.stringify(persistedQuickAccess) !== JSON.stringify(state.quickAccess)
  ) {
    await PortalPreferenceModel.updateOne(
      { userId: session.user.id },
      {
        $set: {
          defaultPortal: state.defaultPortal,
          quickAccess: state.quickAccess,
        },
      },
    );
  }

  return state;
}

export async function getPortalPreferenceState() {
  const session = (await requireCompletedOnboarding()) as AuthSession;
  return getOrCreatePortalPreference(session);
}

async function getSessionPreferenceContext() {
  const session = (await requireCompletedOnboarding()) as AuthSession;
  const state = await getOrCreatePortalPreference(session);

  return { session, state };
}

function assertAvailablePortal(
  portal: PortalKey,
  state: PortalPreferenceState,
) {
  if (!state.availablePortals.includes(portal)) {
    throw new PortalAccessError();
  }
}

export async function selectPortal(portal: PortalKey) {
  const { session, state } = await getSessionPreferenceContext();
  assertAvailablePortal(portal, state);

  const selectedAt = new Date();
  const quickAccess = state.quickAccess.includes(portal)
    ? state.quickAccess
    : [portal, ...state.quickAccess].slice(0, quickAccessLimit);

  await Promise.all([
    PortalPreferenceModel.updateOne(
      { userId: session.user.id },
      {
        $set: {
          lastUsedPortal: portal,
          selectedPortal: portal,
          selectedAt,
          quickAccess,
        },
      },
    ),
    UserModel.updateOne(
      { _id: session.user.id },
      {
        $set: {
          lastUsedPortal: portal,
        },
      },
    ),
  ]);

  const definition = getPortalByKey(portal);

  return {
    state: {
      ...state,
      lastUsedPortal: portal,
      selectedPortal: portal,
      selectedAt: selectedAt.toISOString(),
      quickAccess,
    } satisfies PortalPreferenceState,
    redirectHref: definition?.href ?? "/portal-selection",
  };
}

export async function setDefaultPortal(portal: PortalKey) {
  const { session, state } = await getSessionPreferenceContext();
  assertAvailablePortal(portal, state);

  await PortalPreferenceModel.updateOne(
    { userId: session.user.id },
    {
      $set: {
        defaultPortal: portal,
      },
    },
  );

  return {
    ...state,
    defaultPortal: portal,
    recommendedPortal: portal,
  } satisfies PortalPreferenceState;
}

export async function toggleQuickAccessPortal(portal: PortalKey) {
  const { session, state } = await getSessionPreferenceContext();
  assertAvailablePortal(portal, state);

  const quickAccess = state.quickAccess.includes(portal)
    ? state.quickAccess.filter((item) => item !== portal)
    : [portal, ...state.quickAccess].slice(0, quickAccessLimit);

  await PortalPreferenceModel.updateOne(
    { userId: session.user.id },
    {
      $set: {
        quickAccess,
      },
    },
  );

  return {
    ...state,
    quickAccess,
  } satisfies PortalPreferenceState;
}

export async function resetPortalPreferences() {
  const { session, state } = await getSessionPreferenceContext();
  const defaultPortal = state.availablePortals[0] ?? null;
  const quickAccess = defaultPortal ? [defaultPortal] : [];

  await PortalPreferenceModel.updateOne(
    { userId: session.user.id },
    {
      $set: {
        defaultPortal,
        quickAccess,
        lastUsedPortal: null,
        selectedPortal: null,
        selectedAt: null,
      },
    },
  );

  return {
    ...state,
    defaultPortal,
    recommendedPortal: defaultPortal,
    lastUsedPortal: null,
    quickAccess,
    selectedPortal: null,
    selectedAt: null,
  } satisfies PortalPreferenceState;
}

export async function requirePortalAccess(portal: PortalKey) {
  const state = await getPortalPreferenceState();

  if (!state.availablePortals.includes(portal)) {
    redirect(state.recommendedPortal ? "/portal-selection" : "/onboarding");
  }

  return state;
}
