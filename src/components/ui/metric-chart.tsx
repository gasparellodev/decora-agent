"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricChartProps {
  title: string;
  value: string | number;
  variation?: number;
  periodLabel?: string;
  data: { label: string; value: number }[];
  className?: string;
}

export function MetricChart({
  title,
  value,
  variation,
  periodLabel,
  data,
  className,
}: MetricChartProps) {
  const formattedValue =
    typeof value === "number" ? value.toLocaleString("pt-BR") : value;

  const isPositive = variation !== undefined && variation >= 0;
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl bg-foreground text-background p-6 h-full",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-background/70">{title}</span>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-semibold tracking-tight">
              {formattedValue}
            </span>
            {variation !== undefined && (
              <div
                className={cn(
                  "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                  isPositive
                    ? "bg-green/20 text-green"
                    : "bg-destructive/20 text-destructive"
                )}
              >
                {isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {isPositive ? "+" : ""}
                {variation.toFixed(1)}%
              </div>
            )}
          </div>
        </div>

        {periodLabel && (
          <span className="rounded-full bg-background/10 px-3 py-1 text-xs font-medium">
            {periodLabel}
          </span>
        )}
      </div>

      {/* Chart */}
      <div className="flex-1 flex items-end gap-2 min-h-[120px]">
        {data.map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center gap-2">
            <div
              className="w-full rounded-t-md bg-yellow transition-all duration-300 hover:bg-yellow/80"
              style={{
                height: `${(item.value / maxValue) * 100}%`,
                minHeight: item.value > 0 ? "8px" : "0",
              }}
            />
            <span className="text-[10px] text-background/60 font-medium">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
