import Image, { type ImageProps } from "next/image";

type OptimizedImageProps = ImageProps & {
  eager?: boolean;
};

const tinyBlur =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nNScgaGVpZ2h0PSczJyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnPjxyZWN0IHdpZHRoPSc1JyBoZWlnaHQ9JzMnIGZpbGw9JyNlZWUnLz48L3N2Zz4=";

export function OptimizedImage({ eager = false, ...props }: OptimizedImageProps) {
  const { alt, ...rest } = props;
  return (
    <Image
      {...rest}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      placeholder={rest.placeholder ?? "blur"}
      blurDataURL={rest.blurDataURL ?? tinyBlur}
    />
  );
}
