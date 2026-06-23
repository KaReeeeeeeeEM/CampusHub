import { EmployerProjectDetailClient } from "./project-detail-client";

type EmployerProjectDetailPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function EmployerProjectDetailPage({
  params,
}: EmployerProjectDetailPageProps) {
  const { projectId } = await params;

  return <EmployerProjectDetailClient projectId={projectId} />;
}
