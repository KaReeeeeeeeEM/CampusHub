type CampusFormFieldProps = {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
};

export function CampusFormField({
  label,
  error,
  children,
  className,
}: CampusFormFieldProps) {
  return (
    <label className={className ?? "flex flex-col gap-3 text-sm font-medium"}>
      <span className="leading-none">{label}</span>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </label>
  );
}
