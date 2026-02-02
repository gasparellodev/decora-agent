import { ArrowUpRight, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface StatCardProps {
  title: string;
  value: string | number;
  variation?: number;
  variationLabel?: string;
  accentColor?: "teal" | "blue" | "yellow" | "green" | "default";
  href?: string;
  className?: string;
}

const accentColors = {
  teal: "border-l-teal",
  blue: "border-l-blue",
  yellow: "border-l-yellow",
  green: "border-l-green",
  default: "border-l-foreground/20",
};

export function StatCard({
  title,
  value,
  variation,
  variationLabel = "vs mês anterior",
  accentColor = "default",
  href,
  className,
}: StatCardProps) {
  const formattedValue =
    typeof value === "number" ? value.toLocaleString("pt-BR") : value;

  const isPositive = variation !== undefined && variation >= 0;

  const content = (
    <div
      className={cn(
        "group relative flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg border-l-4",
        accentColors[accentColor],
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        {href && (
          <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tracking-tight">{formattedValue}</span>
      </div>

      {/* Variation */}
      {variation !== undefined && (
        <div className="flex items-center gap-1.5">
          {isPositive ? (
            <TrendingUp className="h-4 w-4 text-green" />
          ) : (
            <TrendingDown className="h-4 w-4 text-destructive" />
          )}
          <span
            className={cn(
              "text-sm font-medium",
              isPositive ? "text-green" : "text-destructive"
            )}
          >
            {isPositive ? "+" : ""}
            {variation.toFixed(1)}%
          </span>
          <span className="text-sm text-muted-foreground">{variationLabel}</span>
        </div>
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
