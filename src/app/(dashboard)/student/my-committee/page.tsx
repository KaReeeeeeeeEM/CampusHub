import { redirect } from "next/navigation";

import { requireStudentLeadershipPosition } from "@/lib/auth/route-guards";

export default async function StudentMyCommitteePage() {
  await requireStudentLeadershipPosition("COMMITTEE_MEMBER");

  redirect("/student/my-committee/tasks");
}
