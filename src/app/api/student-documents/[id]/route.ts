import {
  archiveStudentDocument,
  updateStudentDocument,
} from "@/features/student-documents/lib/student-document-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const document = await updateStudentDocument({
      ...(await request.json()),
      id,
    });

    return apiSuccess({ document });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const document = await archiveStudentDocument({ id });

    return apiSuccess({ document });
  } catch (error) {
    return apiFailure(error);
  }
}
