import { CampusAdminPageHeader } from "@/features/campus-admin/components/campus-admin-page-header";
import { CoursesManagement } from "@/features/campus-admin/components/courses/courses-management";
import {
  getCourses,
  getDepartments,
} from "@/features/campus-admin/lib/campus-admin-service";

export default async function CampusAdminCoursesPage() {
  const [departments, courses] = await Promise.all([
    getDepartments(),
    getCourses(),
  ]);

  return (
    <main className="w-full max-w-none px-4 py-6 sm:px-6">
      <CampusAdminPageHeader
        eyebrow="Academic structure"
        title="Courses"
        description="Create department courses and set the official years of study for graduation tracking."
      />
      <CoursesManagement departments={departments} initialCourses={courses} />
    </main>
  );
}
