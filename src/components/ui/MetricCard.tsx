import { LucideIcon } from "lucide-react";
import { Tone, toneClasses } from "../../lib/ui";
import SurfaceCard from "./SurfaceCard";
import type { Key } from "react";

type MetricCardProps = {
  key?: Key;
  label: string;
  value: string | number;
  description: string;
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
      <div className="relative z-10 flex h-full flex-col justify-between gap-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[hsl(219_18%_52%)]">{label}</p>
            <p className="mt-3 text-[2rem] font-extrabold leading-none tracking-[-0.045em] text-[hsl(222_38%_12%)]">
              {value}
            </p>
          </div>
          <span className={`icon-badge ${toneClasses[tone].ring}`} data-tone={tone === "danger" ? "primary" : tone}>
            <Icon className="h-5 w-5" />
          </span>
        </div>
        <p className="text-sm text-[hsl(219_18%_52%)]">{description}</p>
      </div>
    </SurfaceCard>
  );
}
