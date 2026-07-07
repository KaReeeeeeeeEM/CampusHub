import { apiFailure, apiSuccess } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { queryPostgres } from "@/lib/db/postgres";
import { UserModel } from "@/lib/db/models";

export async function GET() {
  try {
    const user = await requireAuth();

    const [passkeyCount, authUser] = await Promise.all([
      queryPostgres<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM "passkey" WHERE "userId" = $1`,
        [user.id],
      ).then((result) => Number(result.rows[0]?.count ?? 0)),
      UserModel.findById(user.id).select("twoFactorEnabled").lean(),
    ]);

    return apiSuccess({
      hasPasskey: passkeyCount > 0,
      passkeyCount,
      twoFactorEnabled: Boolean(authUser?.twoFactorEnabled),
    });
  } catch (error) {
    return apiFailure(error);
  }
}
