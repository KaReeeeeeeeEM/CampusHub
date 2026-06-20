import { removeCommitteeMember } from "@/features/committees/lib/committee-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string; memberId: string }>;
};

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const { id, memberId } = await params;
    const member = await removeCommitteeMember(id, memberId);

    return apiSuccess({ member });
  } catch (error) {
    return apiFailure(error);
  }
}
