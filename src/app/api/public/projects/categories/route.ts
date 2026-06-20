import { getPublicProjectCategories } from "@/features/projects/lib/public-project-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categories = await getPublicProjectCategories({
      universityId: searchParams.get("universityId") ?? undefined,
    });

    return apiSuccess({ categories });
  } catch (error) {
    return apiFailure(error);
  }
}
