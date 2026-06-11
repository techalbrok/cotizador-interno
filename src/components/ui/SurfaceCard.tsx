import { ReactNode } from "react";
import type { Key } from "react";
import { clsx } from "clsx";

type SurfaceCardProps = {
  key?: Key;
  children: ReactNode;
  className?: string;
  variant?: "default" | "glass" | "soft" | "dark";
  padding?: "none" | "sm" | "md" | "lg";
};

const paddingClasses = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

export default function SurfaceCard({
  children,
  className,
  variant = "default",
  padding = "md",
}: SurfaceCardProps) {
  return (
    <div
      className={clsx(
        variant === "glass"
          ? "surface-glass"
          : variant === "dark"
            ? "surface-card-dark"
            : "surface-card",
        variant === "soft" && "bg-[hsl(220_32%_99%_/_0.74)]",
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
}
