import * as React from "react";

import { Input, type InputProps } from "@/components/ui/input";

export type { InputProps };

export const CampusInput = React.forwardRef<HTMLInputElement, InputProps>(
  (props, ref) => <Input ref={ref} {...props} />,
);

CampusInput.displayName = "CampusInput";
