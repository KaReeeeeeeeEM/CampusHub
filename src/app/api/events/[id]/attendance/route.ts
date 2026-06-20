import {
  checkInEventAttendance,
  listEventAttendance,
} from "@/features/events/lib/event-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const attendance = await listEventAttendance(id);

    return apiSuccess({ attendance });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const result = await checkInEventAttendance(id, await request.json());

    return apiSuccess(result);
  } catch (error) {
    return apiFailure(error);
  }
}
