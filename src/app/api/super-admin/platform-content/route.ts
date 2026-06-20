import {
  createPlatformContent,
  listPlatformContent,
  type PlatformContentType,
} from "@/features/super-admin/lib/platform-content-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const data = await listPlatformContent({
      type: (searchParams.get("type") as PlatformContentType | "all" | null) ?? "all",
      universityId: searchParams.get("universityId") ?? "all",
      q: searchParams.get("q") ?? undefined,
    });

    return apiSuccess(data);
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const item = await createPlatformContent(await request.json());

    return apiSuccess({ item }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
