import { EmployerCandidateProfileView } from "@/features/employer-portal/components/employer-experience";

type EmployerCandidateProfilePageProps = {
  params: Promise<{ userId: string }>;
};

export default async function EmployerCandidateProfilePage({
  params,
}: EmployerCandidateProfilePageProps) {
  const { userId } = await params;

  return <EmployerCandidateProfileView userId={userId} />;
}
