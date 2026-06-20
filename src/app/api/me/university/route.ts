import { apiFailure, apiSuccess } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectMongo } from "@/lib/db/mongodb";
import { UniversityModel } from "@/lib/db/models";

export async function GET() {
  try {
    const user = await requireAuth();

    if (!user.universityId) {
      return apiSuccess({ university: null });
    }

    await connectMongo();

    const university = await UniversityModel.findOne({
      _id: user.universityId,
      deletedAt: null,
    })
      .select({
        _id: 1,
        name: 1,
        shortName: 1,
        country: 1,
        region: 1,
        logo: 1,
        logoUrl: 1,
      })
      .lean();

    return apiSuccess({
      university: university
        ? {
            id: String(university._id),
            name: String(university.name),
            shortName:
              typeof university.shortName === "string"
                ? university.shortName
                : null,
            country:
              typeof university.country === "string" ? university.country : null,
            region:
              typeof university.region === "string" ? university.region : null,
            logo:
              typeof university.logoUrl === "string"
                ? university.logoUrl
                : typeof university.logo === "string"
                  ? university.logo
                  : null,
          }
        : null,
    });
  } catch (error) {
    return apiFailure(error);
  }
}
