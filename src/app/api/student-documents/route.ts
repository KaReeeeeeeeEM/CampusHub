import {
  createStudentDocument,
  listStudentDocuments,
} from "@/features/student-documents/lib/student-document-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const result = await listStudentDocuments(
      Object.fromEntries(url.searchParams.entries()),
    );

    return apiSuccess(result);
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const document = await createStudentDocument(await request.json());

    return apiSuccess({ document }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
