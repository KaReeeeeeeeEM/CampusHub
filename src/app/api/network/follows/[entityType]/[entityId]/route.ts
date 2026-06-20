import { networkFollowEntityTypeSchema } from "@/features/networking/lib/networking-schemas";
import { unfollowEntity } from "@/features/networking/lib/networking-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ entityType: string; entityId: string }>;
};

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const { entityType, entityId } = await params;
    const result = await unfollowEntity(
      networkFollowEntityTypeSchema.parse(entityType),
      entityId,
    );

    return apiSuccess(result);
  } catch (error) {
    return apiFailure(error);
  }
}
