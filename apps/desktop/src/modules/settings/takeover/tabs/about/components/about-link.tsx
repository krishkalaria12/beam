import type { ComponentType } from "react";

import { Button } from "@/components/ui/button";

interface AboutLinkProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}

export function AboutLink({ icon: Icon, label, onClick }: AboutLinkProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className="h-11 rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-4 text-[13px] hover:bg-[var(--launcher-card-hover-bg)]"
    >
      <Icon className="size-4" />
      {label}
    </Button>
  );
}
