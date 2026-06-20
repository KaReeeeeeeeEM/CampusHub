import { searchAlumni } from "@/features/alumni/lib/alumni-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readAlumniSearchQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    q: searchParams.get("q") ?? undefined,
    universityId: searchParams.get("universityId") ?? undefined,
    graduationYear: searchParams.get("graduationYear") ?? undefined,
    collegeId: searchParams.get("collegeId") ?? undefined,
    departmentId: searchParams.get("departmentId") ?? undefined,
    industry: searchParams.get("industry") ?? undefined,
    country: searchParams.get("country") ?? undefined,
    company: searchParams.get("company") ?? undefined,
    position: searchParams.get("position") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const alumni = await searchAlumni(readAlumniSearchQuery(request));

    return apiSuccess({ alumni });
  } catch (error) {
    return apiFailure(error);
  }
}
