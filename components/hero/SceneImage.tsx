import { getImageProps } from "next/image";
import type { HeroImageAsset } from "@/lib/hero-scenes";

const transparentPixel =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

export type SceneImageProps = {
  desktop: HeroImageAsset | null;
  tablet?: HeroImageAsset | null;
  mobile?: HeroImageAsset | null;
  className?: string;
  sizes: {
    desktop: string;
    tablet: string;
    mobile: string;
  };
  decorative?: boolean;
  priority?: boolean;
};

function imageProps(asset: HeroImageAsset | null, sizes: string) {
  if (!asset) {
    return { src: transparentPixel, srcSet: undefined, sizes, width: 1, height: 1 };
  }

  return getImageProps({
    src: asset.src,
    width: asset.width,
    height: asset.height,
    alt: asset.alt ?? "",
    sizes,
  }).props;
}

export default function SceneImage({
  desktop,
  tablet,
  mobile,
  className,
  sizes,
  decorative = false,
  priority = true,
}: SceneImageProps) {
  const tabletAsset = tablet === undefined ? desktop : tablet;
  const mobileAsset = mobile === undefined ? tabletAsset : mobile;

  if (!desktop && !tabletAsset && !mobileAsset) return null;

  const desktopProps = imageProps(desktop, sizes.desktop);
  const tabletProps = imageProps(tabletAsset, sizes.tablet);
  const mobileProps = imageProps(mobileAsset, sizes.mobile);
  const alt = decorative ? "" : (desktop ?? tabletAsset ?? mobileAsset)?.alt ?? "";

  return (
    <picture>
      <source
        media="(max-width: 599px)"
        srcSet={mobileProps.srcSet ?? mobileProps.src}
        sizes={mobileProps.sizes}
        width={mobileProps.width}
        height={mobileProps.height}
      />
      <source
        media="(max-width: 1023px)"
        srcSet={tabletProps.srcSet ?? tabletProps.src}
        sizes={tabletProps.sizes}
        width={tabletProps.width}
        height={tabletProps.height}
      />
      {/* getImageProps optimizes these sources; picture selects one asset without separate preloads. */}
      <img
        {...desktopProps}
        alt={alt}
        aria-hidden={decorative || undefined}
        className={className}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
      />
    </picture>
  );
}
