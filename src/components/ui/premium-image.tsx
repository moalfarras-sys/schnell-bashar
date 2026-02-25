"use client";

import Image, { type ImageProps } from "next/image";
import { cn } from "@/components/ui/cn";

type Overlay = "none" | "subtle" | "bottom" | "brand" | "cinematic";

type PremiumImageProps = Omit<ImageProps, "alt"> & {
  alt: string;
  overlay?: Overlay;
  zoom?: boolean;
  rounded?: "md" | "lg" | "xl" | "2xl" | "3xl" | "full";
  aspect?: "video" | "square" | "portrait" | "wide" | "fourThree" | "auto";
  className?: string;
  containerClassName?: string;
};

const tinyBlur =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nNScgaGVpZ2h0PSczJyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnPjxyZWN0IHdpZHRoPSc1JyBoZWlnaHQ9JzMnIGZpbGw9JyNlZWUnLz48L3N2Zz4=";

const overlayClasses: Record<Overlay, string> = {
  none: "",
  subtle:
    "after:absolute after:inset-0 after:bg-linear-to-br after:from-slate-900/10 after:to-slate-900/5 dark:after:from-slate-950/20 dark:after:to-slate-950/10 after:pointer-events-none after:z-1",
  bottom:
    "after:absolute after:inset-0 after:bg-(image:--img-overlay-bottom) after:pointer-events-none after:z-2",
  brand:
    "after:absolute after:inset-0 after:bg-(image:--img-overlay-brand) after:pointer-events-none after:z-1",
  cinematic:
    "after:absolute after:inset-0 after:bg-linear-to-t after:from-slate-950/70 after:via-slate-950/20 after:to-transparent after:pointer-events-none after:z-2",
};

const roundedClasses = {
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  "3xl": "rounded-3xl",
  full: "rounded-full",
};

const aspectClasses = {
  video: "aspect-video",
  square: "aspect-square",
  portrait: "aspect-[3/4]",
  wide: "aspect-[21/9]",
  fourThree: "aspect-[4/3]",
  auto: "",
};

export function PremiumImage({
  overlay = "subtle",
  zoom = true,
  rounded = "2xl",
  aspect = "auto",
  className,
  containerClassName,
  alt,
  ...props
}: PremiumImageProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden",
        roundedClasses[rounded],
        aspectClasses[aspect],
        overlayClasses[overlay],
        "shadow-lg transition-shadow duration-500 hover:shadow-xl dark:shadow-[0_16px_48px_rgba(0,0,0,0.35)] dark:hover:shadow-[0_20px_56px_rgba(0,0,0,0.45)]",
        containerClassName,
      )}
    >
      <Image
        {...props}
        alt={alt}
        loading={props.loading ?? "lazy"}
        placeholder={props.placeholder ?? "blur"}
        blurDataURL={props.blurDataURL ?? tinyBlur}
        className={cn(
          "h-full w-full object-cover",
          zoom &&
            "transition-transform duration-700 ease-premium group-hover:scale-105",
          className,
        )}
      />
    </div>
  );
}
