import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface CategoryCardProps {
  icon: LucideIcon;
  label: string;
  value?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export function CategoryCard({
  icon: Icon,
  label,
  value,
  href,
  onClick,
  className,
}: CategoryCardProps) {
  const content = (
    <div
      className={cn(
        "flex flex-col items-center gap-3 p-5 rounded-2xl border border-border/60 bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {/* Icon */}
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>

      {/* Label */}
      <span className="text-sm font-medium text-center">{label}</span>

      {/* Value */}
      {value && (
        <span className="text-lg font-semibold">{value}</span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
