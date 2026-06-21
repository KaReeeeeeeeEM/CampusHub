import { removeSuperAdminCommitteeMember } from "@/features/super-admin/lib/super-admin-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type Params = {
  params: Promise<{ committeeId: string; memberId: string }>;
};

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { committeeId, memberId } = await params;
    const result = await removeSuperAdminCommitteeMember(committeeId, memberId);
    return apiSuccess(result);
  } catch (error) {
    return apiFailure(error);
  }
}
