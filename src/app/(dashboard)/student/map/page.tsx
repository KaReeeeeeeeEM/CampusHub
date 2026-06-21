import { MapPageView } from "@/features/student-portal/components/student-experience";
import { listMapLocations } from "@/features/campus-map/lib/campus-map-service";

export default async function StudentMapPage() {
  const locations = await listMapLocations({});

  return <MapPageView initialLocations={locations} />;
}
