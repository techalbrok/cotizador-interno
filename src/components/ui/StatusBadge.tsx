import { clsx } from "clsx";
import { RequestStatus } from "../../types";
import { statusMeta, toneClasses } from "../../lib/ui";

type StatusBadgeProps = {
  status: RequestStatus;
  size?: "sm" | "md";
  className?: string;
};

export default function StatusBadge({ status, size = "md", className }: StatusBadgeProps) {
  const meta = statusMeta[status];
  const tone = toneClasses[meta.tone];

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-2 rounded-full border font-semibold",
        size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
        tone.badge,
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {meta.label}
    </span>
  );
}
