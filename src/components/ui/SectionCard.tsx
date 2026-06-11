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
      <div className="flex items-start justify-between gap-3 border-b border-[hsl(220_14%_88%_/_0.8)] bg-[hsl(220_22%_97%_/_0.4)] px-4 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <span className="icon-badge h-7 w-7 rounded-md shrink-0">
              <Icon className="h-3.5 w-3.5" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-[0.9rem] font-semibold tracking-[-0.01em] text-[hsl(222_38%_12%)] leading-tight">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-[0.78rem] text-[hsl(219_14%_46%)] leading-snug truncate">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>
      <div className={clsx("px-4 py-4", contentClassName)}>{children}</div>
    </SurfaceCard>
  );
}
