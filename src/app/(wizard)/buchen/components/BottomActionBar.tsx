import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

export function BottomActionBar(props: {
  left: ReactNode;
  right: ReactNode;
  spacerTall?: boolean;
  className?: string;
}) {
  return (
    <>
      <div className={cn("sm:hidden", props.spacerTall ? "h-36" : "h-28")} />
      <div
        className={cn(
          "booking-glass-card fixed inset-x-0 bottom-0 z-40 border-t px-4 pt-3 backdrop-blur-xl sm:hidden",
          props.className,
        )}
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-xl gap-3">
          <div className="flex-1">{props.left}</div>
          <div className="flex-1">{props.right}</div>
        </div>
      </div>
    </>
  );
}
