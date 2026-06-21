import { apiFailure, apiSuccess } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { getMongoNativeDb } from "@/lib/db/mongodb";
import { UserModel } from "@/lib/db/models";

export async function GET() {
  try {
    const user = await requireAuth();
    const db = getMongoNativeDb();

    const [passkeyCount, authUser] = await Promise.all([
      db.collection("passkey").countDocuments({ userId: user.id }),
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
