import { LucideIcon } from "lucide-react";
import SurfaceCard from "./SurfaceCard";

type EmptyStateProps = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export default function EmptyState({ title, description, icon: Icon }: EmptyStateProps) {
  return (
    <SurfaceCard className="text-center">
      <div className="relative z-10 flex flex-col items-center gap-4 py-6">
        <span className="icon-badge h-14 w-14 rounded-[1.2rem]">
          <Icon className="h-6 w-6" />
        </span>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold tracking-[-0.02em] text-[hsl(222_38%_12%)]">{title}</h3>
          <p className="max-w-xl text-sm text-[hsl(219_18%_52%)]">{description}</p>
        </div>
      </div>
    </SurfaceCard>
  );
}
