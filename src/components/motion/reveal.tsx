"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/components/ui/cn";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: 1 | 2 | 3;
  threshold?: number;
  once?: boolean;
};

export function Reveal({
  children,
  className,
  delay,
  threshold = 0.1,
  once = true,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, once]);

  return (
    <div
      ref={ref}
      className={cn(
        "reveal",
        isVisible && "reveal--visible",
        delay && `reveal--delay-${delay}`,
        className,
      )}
    >
      {children}
    </div>
  );
}
