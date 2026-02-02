import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityItemProps {
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  title: string;
  subtitle: string;
  value?: string;
  valuePositive?: boolean;
  onClick?: () => void;
  className?: string;
}

export function ActivityItem({
  icon: Icon,
  iconBg = "bg-muted",
  iconColor = "text-foreground",
  title,
  subtitle,
  value,
  valuePositive,
  onClick,
  className,
}: ActivityItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 p-3 rounded-xl transition-colors",
        onClick && "cursor-pointer hover:bg-accent",
        className
      )}
      onClick={onClick}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          iconBg
        )}
      >
        <Icon className={cn("h-5 w-5", iconColor)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{title}</p>
        <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
      </div>

      {/* Value */}
      {value && (
        <span
          className={cn(
            "text-sm font-semibold shrink-0",
            valuePositive === true && "text-green",
            valuePositive === false && "text-destructive"
          )}
        >
          {value}
        </span>
      )}
    </div>
  );
}
