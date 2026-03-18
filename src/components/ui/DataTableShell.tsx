import { ReactNode } from "react";
import { clsx } from "clsx";
import SurfaceCard from "./SurfaceCard";

type DataTableShellProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export default function DataTableShell({
  title,
  description,
  actions,
  children,
  className,
}: DataTableShellProps) {
  return (
    <SurfaceCard padding="none" className={clsx("overflow-hidden", className)}>
      {(title || description || actions) && (
        <div className="border-b border-[hsl(220_16%_86%_/_0.7)] px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              {title && <h3 className="text-lg font-semibold tracking-[-0.02em] text-[hsl(222_38%_12%)]">{title}</h3>}
              {description && <p className="mt-1 text-sm text-[hsl(219_18%_52%)]">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
          </div>
        </div>
      )}
      <div className="table-scroll">{children}</div>
    </SurfaceCard>
  );
}
