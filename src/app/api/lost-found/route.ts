import {
  archiveLostFoundItem,
  createLostFoundItem,
  listLostFoundItems,
  updateLostFoundItem,
} from "@/features/lost-found/lib/lost-found-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const items = await listLostFoundItems(
      Object.fromEntries(url.searchParams.entries()),
    );

    return apiSuccess({ items });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const item = await createLostFoundItem(await request.json());

    return apiSuccess({ item }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const item = await updateLostFoundItem(await request.json());

    return apiSuccess({ item });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const item = await archiveLostFoundItem(await request.json());

    return apiSuccess({ item });
  } catch (error) {
    return apiFailure(error);
  }
}
