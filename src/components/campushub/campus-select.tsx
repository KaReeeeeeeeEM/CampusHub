import { Select, type SelectProps } from "@/components/ui/select";

export type { SelectProps };

export function CampusSelect(props: SelectProps) {
  return <Select {...props} />;
}
