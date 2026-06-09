import { notFound } from "next/navigation";

import { StudentComingSoonPage } from "@/features/student-portal/components/student-coming-soon-page";
import { getStudentNavItemByKey } from "@/features/student-portal/lib/navigation";

type StudentModulePageProps = {
  params: Promise<{
    module: string;
  }>;
};

export default async function StudentModulePage({
  params,
}: StudentModulePageProps) {
  const { module } = await params;
  const item = getStudentNavItemByKey(module);

  if (!item || item.key === "dashboard") {
    notFound();
  }

  return <StudentComingSoonPage item={item} />;
}
