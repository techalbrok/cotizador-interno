import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { clsx } from "clsx";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  actions?: ReactNode;
  accent?: "primary" | "neutral" | "success" | "warning" | "info";
  className?: string;
};

const accentClasses = {
  primary: "before:bg-[linear-gradient(180deg,hsl(350_78%_50%),hsl(223_83%_60%))]",
  neutral: "before:bg-[linear-gradient(180deg,hsl(219_18%_52%),hsl(223_83%_60%))]",
  success: "before:bg-[linear-gradient(180deg,hsl(152_58%_42%),hsl(223_83%_60%))]",
  warning: "before:bg-[linear-gradient(180deg,hsl(33_90%_55%),hsl(350_78%_50%))]",
  info: "before:bg-[linear-gradient(180deg,hsl(223_83%_60%),hsl(350_78%_50%))]",
};

export default function PageHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
  accent = "primary",
  className,
}: PageHeaderProps) {
  return (
    <section
      className={clsx(
        "page-hero animate-rise-in before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:rounded-l-[0.625rem]",
        accentClasses[accent],
        className
      )}
    >
      <div className="relative z-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <span className="icon-badge h-8 w-8 rounded-md shrink-0">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h1 className="text-[1.05rem] font-semibold tracking-[-0.015em] text-[hsl(222_38%_12%)] leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 text-[0.8rem] text-[hsl(219_14%_46%)] leading-snug">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="relative z-10 flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </section>
  );
}
