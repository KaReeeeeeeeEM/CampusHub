import {
  connectUser,
  listConnections,
} from "@/features/networking/lib/networking-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readConnectionQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    status: searchParams.get("status") ?? undefined,
    role: searchParams.get("role") ?? undefined,
    universityId: searchParams.get("universityId") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const connections = await listConnections(readConnectionQuery(request));

    return apiSuccess({ connections });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const result = await connectUser(await request.json());

    return apiSuccess(result, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
