import { CampusAdminPageHeader } from "@/features/campus-admin/components/campus-admin-page-header";
import { MapManagement } from "@/features/campus-admin/components/maps/map-management";
import { mockCampusLocations } from "@/features/campus-admin/lib/mock-data";

export default function CampusAdminMapsPage() {
  return (
    <main className="w-full max-w-none px-4 py-6 sm:px-6">
      <CampusAdminPageHeader
        eyebrow="Campus navigation"
        title="Campus Map"
        description="Manage campus locations, categories, and map points for future student wayfinding."
      />
      <MapManagement initialLocations={mockCampusLocations} />
    </main>
  );
}
