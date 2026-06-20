import {
  createForumCategory,
  listForumCategories,
} from "@/features/forums/lib/forum-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET() {
  try {
    const categories = await listForumCategories();

    return apiSuccess({ categories });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const category = await createForumCategory(await request.json());

    return apiSuccess({ category }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
