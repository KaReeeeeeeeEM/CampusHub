import { redirect } from "next/navigation";

import { requireStudentLeadershipPosition } from "@/lib/auth/route-guards";

export default async function StudentLeadershipSuggestionsPage() {
  await requireStudentLeadershipPosition("REPRESENTATIVE");

  redirect("/student/leadership");
}
