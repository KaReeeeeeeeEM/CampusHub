import {
  deletePlatformContent,
  updatePlatformContent,
} from "@/features/super-admin/lib/platform-content-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  try {
    const { type, id } = await params;
    const item = await updatePlatformContent(type, id, await request.json());

    return apiSuccess({ item });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  try {
    const { type, id } = await params;
    await deletePlatformContent(type, id);

    return apiSuccess({ id, type });
  } catch (error) {
    return apiFailure(error);
  }
}
