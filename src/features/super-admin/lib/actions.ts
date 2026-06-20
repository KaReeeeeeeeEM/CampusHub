"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createCampusAdminInvitation,
  createUniversity,
  deactivateUniversity,
  updateUniversity,
} from "@/features/super-admin/lib/super-admin-service";
import type { CampusAdminInvitationInput, UniversityInput } from "./schemas";

function value(formData: FormData, key: string) {
  const field = formData.get(key);
  return typeof field === "string" ? field : "";
}

function coordinateValue(formData: FormData, key: string) {
  const field = value(formData, key);
  const number = Number(field);

  return field.trim() && Number.isFinite(number) ? number : null;
}

function readUniversityForm(formData: FormData): UniversityInput {
  return {
    name: value(formData, "name"),
    shortName: value(formData, "shortName"),
    slug: value(formData, "slug"),
    description: value(formData, "description"),
    logo: value(formData, "logo"),
    coverImage: value(formData, "coverImage"),
    country: value(formData, "country"),
    region: value(formData, "region"),
    website: value(formData, "website"),
    email: value(formData, "email"),
    phone: value(formData, "phone"),
    locationName: value(formData, "locationName"),
    locationAddress: value(formData, "locationAddress"),
    locationLatitude: coordinateValue(formData, "locationLatitude"),
    locationLongitude: coordinateValue(formData, "locationLongitude"),
    status: value(formData, "status") as UniversityInput["status"],
  };
}

export async function createUniversityAction(formData: FormData) {
  await createUniversity(readUniversityForm(formData));
  revalidatePath("/super-admin");
  revalidatePath("/super-admin/universities");
  redirect("/super-admin/universities?created=1");
}

export async function updateUniversityAction(
  universityId: string,
  formData: FormData,
) {
  await updateUniversity(universityId, readUniversityForm(formData));
  revalidatePath("/super-admin");
  revalidatePath("/super-admin/universities");
  redirect("/super-admin/universities?updated=1");
}

export async function deactivateUniversityAction(universityId: string) {
  await deactivateUniversity(universityId);
  revalidatePath("/super-admin");
  revalidatePath("/super-admin/universities");
}

export async function createCampusAdminInvitationAction(formData: FormData) {
  const input: CampusAdminInvitationInput = {
    universityId: value(formData, "universityId"),
    expiresInDays: Number(value(formData, "expiresInDays") || 14),
  };

  await createCampusAdminInvitation(input);
  revalidatePath("/super-admin");
  revalidatePath("/super-admin/campus-admins");
  redirect("/super-admin/campus-admins?invited=1");
}
