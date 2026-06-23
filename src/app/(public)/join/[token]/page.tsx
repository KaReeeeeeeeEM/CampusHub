import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentInvitationRegistrationForm } from "@/features/enrollment/components/student-invitation-registration-form";
import { resolveInvitation } from "@/features/enrollment/lib/invitation-service";

type JoinInvitationPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function JoinInvitationPage({
  params,
}: JoinInvitationPageProps) {
  const { token } = await params;
  const resolution = await resolveInvitation(token);

  if (resolution.status === "expired") {
    redirect("/join/expired");
  }

  if (resolution.status !== "valid") {
    redirect("/join/invalid");
  }

  const representativeName =
    resolution.representativeUser?.name || "College Representative";

  return (
    <main className="min-h-screen bg-background px-4 py-24 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-primary">
              Student invitation
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-normal sm:text-5xl">
              Join your college on CampusHub.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
              This invitation securely connects your account to the correct
              university and college. You only need to complete your student
              profile and account credentials.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Invitation details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground">University</p>
                <p className="font-medium">{resolution.university.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">College</p>
                <p className="font-medium">{resolution.college.name}</p>
              </div>
              {resolution.course ? (
                <div>
                  <p className="text-muted-foreground">Course</p>
                  <p className="font-medium">
                    {resolution.course.name} ({resolution.course.code})
                  </p>
                  <p className="text-muted-foreground">
                    Year {resolution.invitation.yearOfStudy} · graduates{" "}
                    {resolution.invitation.expectedGraduationYear}
                  </p>
                </div>
              ) : null}
              <div>
                <p className="text-muted-foreground">Invited by</p>
                <p className="font-medium">{representativeName}</p>
                {resolution.representative.title ? (
                  <p className="text-muted-foreground">
                    {resolution.representative.title}
                  </p>
                ) : null}
              </div>
              {resolution.invitation.expiresAt ? (
                <div>
                  <p className="text-muted-foreground">Valid until</p>
                  <p className="font-medium">
                    {new Intl.DateTimeFormat("en", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(resolution.invitation.expiresAt))}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Student registration</CardTitle>
          </CardHeader>
          <CardContent>
            <StudentInvitationRegistrationForm
              invitation={{
                token,
                universityName: resolution.university.name,
                collegeName: resolution.college.name,
                departments: resolution.departments,
                course: resolution.course,
                invitation: {
                  yearOfStudy: resolution.invitation.yearOfStudy,
                  expectedGraduationYear:
                    resolution.invitation.expectedGraduationYear,
                },
              }}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
