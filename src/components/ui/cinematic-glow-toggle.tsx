"use client";

import { cn } from "@/lib/utils";
import React from "react";
import { motion } from "framer-motion";

interface CinematicGlowToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  showLabels?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: { track: "w-10 h-5", thumb: "w-4 h-4", translate: 20 },
  md: { track: "w-12 h-6", thumb: "w-5 h-5", translate: 24 },
  lg: { track: "w-14 h-7", thumb: "w-6 h-6", translate: 28 },
};

const CinematicGlowToggle = ({
  checked,
  onCheckedChange,
  disabled = false,
  showLabels = false,
  size = "md",
  className,
}: CinematicGlowToggleProps) => {
  const sizeConfig = sizes[size];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange(!checked)}
      className={cn(
        "flex items-center gap-2 select-none",
        disabled && "opacity-50 cursor-not-allowed",
        !disabled && "cursor-pointer",
        className
      )}
    >
      {showLabels && (
        <span
          className={cn(
            "text-xs font-semibold tracking-wide transition-colors duration-200",
            !checked ? "text-muted-foreground" : "text-muted-foreground/40"
          )}
        >
          OFF
        </span>
      )}

      {/* Switch Track */}
      <motion.div
        className={cn(
          "relative rounded-full shadow-inner border border-border/50",
          sizeConfig.track
        )}
        animate={{
          backgroundColor: checked ? "rgb(24, 24, 27)" : "rgb(228, 228, 231)",
        }}
        transition={{ duration: 0.2 }}
      >
        {/* Switch Thumb */}
        <motion.div
          className={cn(
            "absolute top-0.5 left-0.5 rounded-full shadow-md",
            sizeConfig.thumb
          )}
          animate={{
            x: checked ? sizeConfig.translate : 0,
            backgroundColor: checked ? "rgb(250, 250, 250)" : "rgb(113, 113, 122)",
          }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </motion.div>

      {showLabels && (
        <span
          className={cn(
            "text-xs font-semibold tracking-wide transition-colors duration-200",
            checked ? "text-foreground" : "text-muted-foreground/40"
          )}
        >
          ON
        </span>
      )}
    </button>
  );
};

export { CinematicGlowToggle };
