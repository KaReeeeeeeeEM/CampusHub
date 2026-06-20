import { sendAlmanacReminder } from "@/features/almanac/lib/almanac-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = { params: Promise<{ id: string }> };

async function readJsonOrEmpty(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const event = await sendAlmanacReminder(id, await readJsonOrEmpty(request));

    return apiSuccess({ event });
  } catch (error) {
    return apiFailure(error);
  }
}
