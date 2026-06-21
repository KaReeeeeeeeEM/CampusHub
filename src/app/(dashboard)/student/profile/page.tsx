import { AccountProfilePage } from "@/features/account/components/account-profile-page";

export default function StudentProfilePage() {
  return (
    <AccountProfilePage
      fallbackName="Student profile"
      identityLabel="Student Identity"
      bioPlaceholder="Share a short bio, academic interests, skills, or the kind of opportunities you are looking for."
    />
  );
}
