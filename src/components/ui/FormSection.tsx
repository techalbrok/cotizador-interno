import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import type { Key } from "react";
import { clsx } from "clsx";

type FormSectionProps = {
  key?: Key;
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
};

export default function FormSection({
  title,
  description,
  icon: Icon,
  children,
  className,
}: FormSectionProps) {
  return (
    <section className={clsx("rounded-[1.35rem] border border-[hsl(220_16%_86%_/_0.72)] bg-white/70 p-5 sm:p-6", className)}>
      <div className="mb-5 flex items-start gap-3">
        {Icon && (
          <span className="icon-badge h-10 w-10 rounded-[0.95rem]">
            <Icon className="h-4.5 w-4.5" />
          </span>
        )}
        <div>
          <h3 className="text-base font-semibold tracking-[-0.02em] text-[hsl(222_38%_12%)]">{title}</h3>
          {description && <p className="mt-1 text-sm text-[hsl(219_18%_52%)]">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
