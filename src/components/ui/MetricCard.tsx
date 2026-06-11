import { LucideIcon } from "lucide-react";
import { Tone, toneClasses } from "../../lib/ui";
import SurfaceCard from "./SurfaceCard";
import type { Key } from "react";

type MetricCardProps = {
  key?: Key;
  label: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  tone?: Tone;
  className?: string;
};

export default function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "primary",
  className,
}: MetricCardProps) {
  return (
    <SurfaceCard className={`metric-card animate-fade-in ${className || ""}`}>
      <div className="relative z-10 flex h-full items-center gap-3">
        <span className={`icon-badge ${toneClasses[tone].ring}`} data-tone={tone === "danger" ? "primary" : tone}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.04em] text-[hsl(219_14%_46%)] leading-tight truncate">
            {label}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="text-[1.5rem] font-semibold leading-none tracking-[-0.025em] text-[hsl(222_38%_12%)] tabular-nums">
              {value}
            </p>
            {description && (
              <p className="text-[0.75rem] text-[hsl(219_14%_46%)] truncate">{description}</p>
            )}
          </div>
        </div>
      </div>
    </SurfaceCard>
  );
}
