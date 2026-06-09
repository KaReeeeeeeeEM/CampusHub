import { Textarea, type TextareaProps } from "@/components/ui/textarea";

export type { TextareaProps };

export function CampusTextarea(props: TextareaProps) {
  return <Textarea {...props} />;
}
