import { CampusFormField } from "@/components/campushub";

type AuthFieldProps = {
  label: string;
  error?: string;
  children: React.ReactNode;
};

export function AuthField({ label, error, children }: AuthFieldProps) {
  return (
    <CampusFormField label={label} error={error}>
      {children}
    </CampusFormField>
  );
}
