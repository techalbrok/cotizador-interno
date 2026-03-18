import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { clsx } from "clsx";
import SurfaceCard from "./SurfaceCard";

type SectionCardProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export default function SectionCard({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
  contentClassName,
}: SectionCardProps) {
  return (
    <SurfaceCard padding="none" className={clsx("section-panel overflow-hidden", className)}>
      <div className="border-b border-[hsl(220_16%_86%_/_0.68)] bg-white/68 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            {Icon && (
              <span className="icon-badge h-11 w-11 rounded-[1rem]">
                <Icon className="h-5 w-5" />
              </span>
            )}
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-[hsl(222_38%_12%)]">
                {title}
              </h2>
              {description && (
                <p className="mt-1 text-sm text-[hsl(219_18%_52%)]">
                  {description}
                </p>
              )}
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
        </div>
      </div>
      <div className={clsx("px-5 py-5 sm:px-6 sm:py-6", contentClassName)}>{children}</div>
    </SurfaceCard>
  );
}
