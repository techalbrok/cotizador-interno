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
        <div className="flex flex-col gap-3 border-b border-[hsl(220_14%_88%_/_0.8)] bg-[hsl(220_22%_97%_/_0.4)] px-4 py-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            {title && <h3 className="text-[0.9rem] font-semibold tracking-[-0.01em] text-[hsl(222_38%_12%)] leading-tight">{title}</h3>}
            {description && <p className="mt-0.5 text-[0.78rem] text-[hsl(219_14%_46%)] leading-snug">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="table-scroll">{children}</div>
    </SurfaceCard>
  );
}
