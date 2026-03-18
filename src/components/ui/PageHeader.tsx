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
        "page-hero animate-rise-in before:absolute before:left-0 before:top-0 before:h-full before:w-1.5 before:rounded-l-[1.75rem]",
        accentClasses[accent],
        className
      )}
    >
      <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <span className="icon-badge h-14 w-14 rounded-[1.2rem]">
            <Icon className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-[1.9rem] font-extrabold tracking-[-0.035em] text-[hsl(222_38%_12%)]">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm text-[hsl(219_18%_52%)] sm:text-base">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="relative z-10 flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </section>
  );
}
