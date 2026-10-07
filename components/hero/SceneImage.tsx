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
  priority?: "mobile" | "desktop";
  eager?: boolean;
};

function imageProps(asset: HeroImageAsset | null, sizes: string) {
  if (!asset) {
    return { src: transparentPixel, srcSet: undefined, sizes, width: 1, height: 1 };
  }
  if (asset.optimized) {
    return { src: asset.optimized.src, srcSet: asset.optimized.webp, sizes, width: asset.width, height: asset.height };
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
  priority,
  eager = false,
}: SceneImageProps) {
  const tabletAsset = tablet === undefined ? desktop : tablet;
  const mobileAsset = mobile === undefined ? tabletAsset : mobile;

  if (!desktop && !tabletAsset && !mobileAsset) return null;

  const desktopProps = imageProps(desktop, sizes.desktop);
  const tabletProps = imageProps(tabletAsset, sizes.tablet);
  const mobileProps = imageProps(mobileAsset, sizes.mobile);
  const alt = decorative ? "" : (desktop ?? tabletAsset ?? mobileAsset)?.alt ?? "";

  return (
    <>
      {priority === "mobile" && mobileAsset?.optimized && <link rel="preload" as="image" type="image/avif" media="(max-width: 599px)" imageSrcSet={mobileAsset.optimized.avif} imageSizes={sizes.mobile} fetchPriority="high" />}
      {priority === "mobile" && tabletAsset?.optimized && <link rel="preload" as="image" type="image/avif" media="(min-width: 600px) and (max-width: 1023px)" imageSrcSet={tabletAsset.optimized.avif} imageSizes={sizes.tablet} fetchPriority="high" />}
      {priority === "desktop" && desktop?.optimized && <link rel="preload" as="image" type="image/avif" media="(min-width: 1024px)" imageSrcSet={desktop.optimized.avif} imageSizes={sizes.desktop} fetchPriority="high" />}
    <picture>
      {mobileAsset?.optimized && <source media="(max-width: 599px)" type="image/avif" srcSet={mobileAsset.optimized.avif} sizes={sizes.mobile} width={mobileAsset.width} height={mobileAsset.height} />}
      <source
        media="(max-width: 599px)"
        srcSet={mobileProps.srcSet ?? mobileProps.src}
        sizes={mobileProps.sizes}
        width={mobileProps.width}
        height={mobileProps.height}
      />
      {tabletAsset?.optimized && <source media="(max-width: 1023px)" type="image/avif" srcSet={tabletAsset.optimized.avif} sizes={sizes.tablet} width={tabletAsset.width} height={tabletAsset.height} />}
      <source
        media="(max-width: 1023px)"
        srcSet={tabletProps.srcSet ?? tabletProps.src}
        sizes={tabletProps.sizes}
        width={tabletProps.width}
        height={tabletProps.height}
      />
      {desktop?.optimized && <source type="image/avif" srcSet={desktop.optimized.avif} sizes={sizes.desktop} />}
      {/* Picture selects one format and responsive source for each visible layer. */}
      <img
        {...desktopProps}
        alt={alt}
        aria-hidden={decorative || undefined}
        className={className}
        loading={priority || eager ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
      />
    </picture>
    </>
  );
}
