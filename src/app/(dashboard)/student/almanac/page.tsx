import { listVisibleAlmanacs } from "@/features/almanac/lib/almanac-service";
import { AlmanacPageView } from "@/features/student-portal/components/student-experience";

export default async function StudentAlmanacPage() {
  const almanacs = await listVisibleAlmanacs();

  return <AlmanacPageView initialAlmanacs={almanacs} />;
}
