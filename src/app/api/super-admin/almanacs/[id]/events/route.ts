import { createSuperAdminAlmanacEvent } from "@/features/super-admin/lib/super-admin-almanac-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const event = await createSuperAdminAlmanacEvent(id, await request.json());

    return apiSuccess({ event }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
