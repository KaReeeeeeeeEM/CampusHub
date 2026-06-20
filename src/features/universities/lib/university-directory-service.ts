import { connectMongo } from "@/lib/db/mongodb";
import { CollegeModel, UniversityModel } from "@/lib/db/models";

export type PublicUniversity = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  city: string;
  country: string;
  type: "Public" | "Private";
  status: "Live" | "Onboarding" | "Coming Soon";
  founded: string | null;
  brandColor: string;
  accentColor: string;
  tagline: string;
  description: string;
  image: string;
  colleges: string[];
  stats: Array<{ label: string; value: string }>;
  publicEvents: Array<{
    title: string;
    date: string;
    location: string;
    description: string;
  }>;
  publicOpportunities: Array<{
    title: string;
    type: string;
    deadline: string;
    description: string;
  }>;
};

function serializeDateYear(value: unknown) {
  return value instanceof Date ? String(value.getFullYear()) : null;
}

function mapStatus(status: unknown): PublicUniversity["status"] {
  if (status === "ACTIVE") return "Live";
  if (status === "PENDING") return "Onboarding";
  return "Coming Soon";
}

async function getCollegeNames(universityIds: string[]) {
  if (universityIds.length === 0) return new Map<string, string[]>();

  const colleges = await CollegeModel.find({
    universityId: { $in: universityIds },
    deletedAt: null,
  })
    .select({ universityId: 1, name: 1 })
    .sort({ name: 1 })
    .lean();

  const names = new Map<string, string[]>();

  for (const college of colleges) {
    const universityId = String(college.universityId);
    const current = names.get(universityId) ?? [];
    current.push(String(college.name));
    names.set(universityId, current);
  }

  return names;
}

function serializeUniversity(
  university: Record<string, unknown>,
  colleges: string[],
): PublicUniversity {
  const name = String(university.name);
  const shortName = String(university.shortName ?? name);
  const description = String(university.description ?? "");

  return {
    id: String(university._id),
    slug: String(university.slug),
    name,
    shortName,
    city: String(university.city ?? university.region ?? ""),
    country: String(university.country ?? ""),
    type: "Public",
    status: mapStatus(university.status),
    founded: serializeDateYear(university.createdAt),
    brandColor: "#0F766E",
    accentColor: "#2563EB",
    tagline: description || `${name} on CampusHub.`,
    description,
    image:
      String(university.coverImage ?? university.logo ?? university.logoUrl ?? "") ||
      "/images/photography/university-benefits.webp",
    colleges,
    stats: [],
    publicEvents: [],
    publicOpportunities: [],
  };
}

export async function listPublicUniversities() {
  await connectMongo();

  const universities = await UniversityModel.find({ deletedAt: null })
    .sort({ name: 1 })
    .lean();
  const collegeNames = await getCollegeNames(
    universities.map((university) => String(university._id)),
  );

  return universities.map((university) =>
    serializeUniversity(
      university as Record<string, unknown>,
      collegeNames.get(String(university._id)) ?? [],
    ),
  );
}

export async function getPublicUniversityBySlug(slug: string) {
  await connectMongo();

  const university = await UniversityModel.findOne({ slug, deletedAt: null }).lean();

  if (!university) return null;

  const collegeNames = await getCollegeNames([String(university._id)]);

  return serializeUniversity(
    university as Record<string, unknown>,
    collegeNames.get(String(university._id)) ?? [],
  );
}
