import { AccountProfilePage } from "@/features/account/components/account-profile-page";

export default function TeacherProfilePage() {
  return (
    <AccountProfilePage
      fallbackName="Teacher profile"
      bioPlaceholder="Share a short academic bio, research focus, or teaching interests."
    />
  );
}
