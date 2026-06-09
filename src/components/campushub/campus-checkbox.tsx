import { Checkbox, type CheckboxProps } from "@/components/ui/checkbox";

export type { CheckboxProps };

export function CampusCheckbox(props: CheckboxProps) {
  return <Checkbox {...props} />;
}
