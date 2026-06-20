import {
  assignRepresentative,
  listRepresentatives,
} from "@/features/university-management/lib/university-management-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const representatives = await listRepresentatives({
      includeInactive: searchParams.get("includeInactive"),
    });

    return apiSuccess({ representatives });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const result = await assignRepresentative(await request.json());

    return apiSuccess(result, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
