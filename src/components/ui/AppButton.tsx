import { ButtonHTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";

type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "min-h-10 px-4 text-sm",
  md: "min-h-11 px-4.5 text-sm",
  lg: "min-h-12 px-5 text-[0.95rem]",
};

const variantClasses = {
  primary: "button-primary-albroksa",
  secondary: "button-secondary-albroksa",
  ghost: "inline-flex items-center justify-center gap-2 rounded-2xl border border-transparent px-4 py-2.5 font-semibold text-[hsl(222_38%_12%)] transition hover:bg-white/60",
  danger: "inline-flex items-center justify-center gap-2 rounded-2xl border border-[hsl(353_83%_60%_/_0.2)] bg-[hsl(353_83%_60%_/_0.08)] px-4 py-2.5 font-semibold text-[hsl(353_72%_46%)] transition hover:bg-[hsl(353_83%_60%_/_0.12)]",
};

export default function AppButton({
  children,
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: AppButtonProps) {
  return (
    <button
      type={type}
      className={clsx(variantClasses[variant], sizeClasses[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
