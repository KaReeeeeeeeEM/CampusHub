"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/radix-select";
import { isRoleKey } from "@/features/authorization/roles";
import { useAuth } from "@/features/auth/auth-provider";
import {
  DEV_ROLE_PREVIEW_COOKIE,
  getRolePreviewDestination,
  isRolePreviewKey,
  rolePreviewKeys,
  rolePreviewLabels,
  type RolePreviewKey,
} from "@/features/development/role-preview";

function readPreviewRole() {
  if (typeof document === "undefined") {
    return "SUPER_ADMIN";
  }

  const value = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${DEV_ROLE_PREVIEW_COOKIE}=`))
    ?.split("=")[1];
  const decoded = value ? decodeURIComponent(value) : null;

  return isRolePreviewKey(decoded) ? decoded : "SUPER_ADMIN";
}

function writePreviewRole(role: RolePreviewKey) {
  document.cookie = `${DEV_ROLE_PREVIEW_COOKIE}=${encodeURIComponent(
    role,
  )}; path=/; max-age=604800; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent("campushub:dev-role-preview"));
}

export function DevelopmentRoleSwitcher() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeRole, setActiveRole] = useState<RolePreviewKey>("SUPER_ADMIN");
  const userRoles = user?.roles?.length ? user.roles : user?.role ? [user.role] : [];
  const canPreview = userRoles.some(isRoleKey) && userRoles.includes("SUPER_ADMIN");

  useEffect(() => {
    const sync = () => setActiveRole(readPreviewRole());

    sync();
    window.addEventListener("campushub:dev-role-preview", sync);

    return () => window.removeEventListener("campushub:dev-role-preview", sync);
  }, []);

  if (process.env.NODE_ENV === "production" || !canPreview) {
    return null;
  }

  return (
    <Select
      value={activeRole}
      onValueChange={(value) => {
        if (!isRolePreviewKey(value)) {
          return;
        }

        setActiveRole(value);
        writePreviewRole(value);
        router.push(getRolePreviewDestination(value));
        router.refresh();
      }}
    >
      <SelectTrigger className="mb-4">
        <SelectValue aria-label={rolePreviewLabels[activeRole]}>
          {rolePreviewLabels[activeRole]}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {rolePreviewKeys.map((role) => (
          <SelectItem key={role} value={role}>
            {rolePreviewLabels[role]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
