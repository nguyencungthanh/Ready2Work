"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type Direction = "up" | "left" | "right";

const HIDDEN_TRANSFORM: Record<Direction, string> = {
  up: "translate-y-8",
  left: "-translate-x-8",
  right: "translate-x-8",
};

export function ScrollFadeIn({
  children,
  direction = "up",
  delayMs = 0,
  className,
}: {
  children: ReactNode;
  direction?: Direction;
  delayMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setVisible(true);
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delayMs}ms` }}
      className={`transition-all duration-700 ease-out ${
        visible ? "translate-x-0 translate-y-0 opacity-100" : `opacity-0 ${HIDDEN_TRANSFORM[direction]}`
      } ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
