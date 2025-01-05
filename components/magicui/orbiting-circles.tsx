"use client"

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export default function OrbitingCircles({
  className,
  children,
  reverse,
  duration = 20,
  delay = 10,
  radius = 50,
  path = true,
}: {
  className?: string;
  children?: React.ReactNode;
  reverse?: boolean;
  duration?: number;
  delay?: number;
  radius?: number;
  path?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      {path && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          version="1.1"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <circle
            className="stroke-black/10 stroke-1 dark:stroke-white/10"
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
            strokeDasharray={"4 4"}
          />
        </svg>
      )}

      <div
        style={
          {
            "--duration": duration,
            "--radius": radius,
            "--delay": -delay,
          } as React.CSSProperties
        }
        className={cn(
          `absolute flex h-full w-full transform-gpu animate-orbit items-center justify-center rounded-full border
           [animation-delay:calc(var(--delay)*1000ms)] transition-all duration-300 ease-in-out hover:scale-110 hover:shadow-lg`,
          { "[animation-direction:reverse]": reverse },
          className,
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className={cn("transition-transform duration-300 ease-in-out", { "scale-125": isHovered })}>
          {children}
        </div>
      </div>
    </>
  );
}