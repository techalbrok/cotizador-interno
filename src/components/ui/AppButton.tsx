import { ButtonHTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";

type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "min-h-7 px-2.5 text-[0.78rem]",
  md: "min-h-8 px-3 text-[0.85rem]",
  lg: "min-h-9 px-4 text-[0.9rem]",
};

const variantClasses = {
  primary: "button-primary-albroksa",
  secondary: "button-secondary-albroksa",
  ghost: "inline-flex items-center justify-center gap-1.5 rounded-md border border-transparent px-2.5 py-1.5 text-[0.85rem] font-medium text-[hsl(222_38%_12%)] transition hover:bg-[hsl(220_22%_97%)]",
  danger: "inline-flex items-center justify-center gap-1.5 rounded-md border border-[hsl(353_78%_52%_/_0.22)] bg-[hsl(353_78%_52%_/_0.08)] px-2.5 py-1.5 text-[0.85rem] font-medium text-[hsl(353_72%_44%)] transition hover:bg-[hsl(353_78%_52%_/_0.14)]",
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
