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
        "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-[11px]",
        tone.badge,
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70 shrink-0" />
      {meta.label}
    </span>
  );
}
