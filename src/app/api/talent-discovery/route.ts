import { searchTalent } from "@/features/career/lib/talent-discovery-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readSearchQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    q: searchParams.get("q") ?? undefined,
    universityId: searchParams.get("universityId") ?? undefined,
    collegeId: searchParams.get("collegeId") ?? undefined,
    departmentId: searchParams.get("departmentId") ?? undefined,
    skills: searchParams.get("skills") ?? undefined,
    projectSkills: searchParams.get("projectSkills") ?? undefined,
    projectCategories: searchParams.get("projectCategories") ?? undefined,
    projectQuery: searchParams.get("projectQuery") ?? undefined,
    badgeIds: searchParams.get("badgeIds") ?? undefined,
    badgeCategories: searchParams.get("badgeCategories") ?? undefined,
    minXp: searchParams.get("minXp") ?? undefined,
    minLevel: searchParams.get("minLevel") ?? undefined,
    graduationYear: searchParams.get("graduationYear") ?? undefined,
    minExperienceCount: searchParams.get("minExperienceCount") ?? undefined,
    availabilityStatus: searchParams.get("availabilityStatus") ?? undefined,
    preferredWorkType: searchParams.get("preferredWorkType") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const result = await searchTalent(readSearchQuery(request));

    return apiSuccess(result);
  } catch (error) {
    return apiFailure(error);
  }
}
