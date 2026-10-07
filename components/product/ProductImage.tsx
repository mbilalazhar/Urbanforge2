import Image, { type ImageProps } from "next/image";
import { canOptimizeProductImage } from "@/lib/product-media";

/** Uploaded/local media is public and immutable; unknown external hosts keep working. */
export default function ProductImage(props: ImageProps) {
  return <Image {...props} alt={props.alt} unoptimized={typeof props.src === "string" && !canOptimizeProductImage(props.src)} />;
}
