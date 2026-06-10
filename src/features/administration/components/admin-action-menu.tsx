"use client";

import { FiMoreVertical } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type AdminActionMenuItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  destructive?: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

type AdminActionMenuProps = {
  items: AdminActionMenuItem[];
  label?: string;
};

export function AdminActionMenu({
  items,
  label = "Open row actions",
}: AdminActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label={label} size="icon" type="button" variant="ghost">
          <FiMoreVertical className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <DropdownMenuItem
              key={item.label}
              destructive={item.destructive}
              disabled={item.disabled}
              onSelect={item.onSelect}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
