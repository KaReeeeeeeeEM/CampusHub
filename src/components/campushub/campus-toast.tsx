"use client";

import { toast } from "sonner";
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiCheckCircle,
  FiInfo,
} from "react-icons/fi";

type CampusToastInput = {
  title: string;
  description: string;
};

export const campusToast = {
  success({ title, description }: CampusToastInput) {
    toast.success(title, {
      description,
      icon: <FiCheckCircle className="h-4 w-4" aria-hidden="true" />,
    });
  },
  error({ title, description }: CampusToastInput) {
    toast.error(title, {
      description,
      icon: <FiAlertCircle className="h-4 w-4" aria-hidden="true" />,
    });
  },
  warning({ title, description }: CampusToastInput) {
    toast.warning(title, {
      description,
      icon: <FiAlertTriangle className="h-4 w-4" aria-hidden="true" />,
    });
  },
  info({ title, description }: CampusToastInput) {
    toast.info(title, {
      description,
      icon: <FiInfo className="h-4 w-4" aria-hidden="true" />,
    });
  },
};
