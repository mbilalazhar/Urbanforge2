export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_MEDIA_BYTES = 100 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export function canOptimizeProductImage(src: string) {
  if (src.startsWith("/") && !src.startsWith("//")) return true;
  try {
    const url = new URL(src);
    return url.protocol === "https:" && url.hostname === "images.unsplash.com" && !url.port && !url.username && !url.password;
  } catch { return false; }
}

export const VIDEO_URL_GUIDANCE = "Use a direct .mp4, .webm or .mov file URL, or upload the video file. Links to video webpages, such as Magnific or Freepik, cannot play in the product video player. Download the video from its provider and upload the file instead.";

export function isProductVideoUrl(value: string) {
  if (!/^https?:\/\//i.test(value) && !/^\/(?!\/)/.test(value)) return false;
  try {
    const url = new URL(value, "https://urbanforge.invalid");
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) return false;
    return /\.(mp4|webm|mov)$/i.test(url.pathname)
      || /^\/api\/media\/[a-f0-9]{24}$/.test(url.pathname);
  } catch { return false; }
}
