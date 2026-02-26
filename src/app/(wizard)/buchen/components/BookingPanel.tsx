import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

export function BookingPanel(props: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("booking-glass-card booking-motion-reveal rounded-3xl p-6 sm:p-8", props.className)}>
      {props.children}
    </section>
  );
}
