"use client";

import { useEffect, useRef, useState } from "react";
import { isProductVideoUrl, VIDEO_URL_GUIDANCE } from "@/lib/product-media";
import styles from "./catalog.module.css";

function VideoPreview({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return <>
    <video src={src} controls playsInline preload="metadata" aria-label={name} className={styles.mediaPreview} onError={() => setFailed(true)} onLoadedData={() => setFailed(false)} />
    {failed && <p role="status" className={styles.mediaError}>This video cannot be played. Use an accessible direct video URL or upload an MP4 encoded with H.264.</p>}
  </>;
}

export function ProductVideoUrls({ urls }: { urls: string[] }) {
  return <div className={styles.mediaFiles}>{urls.slice(0, 10).map((url, index) => <div className={styles.mediaFile} key={`${url}-${index}`}>
    {isProductVideoUrl(url)
      ? <VideoPreview src={url} name={`Product video ${index + 1} preview`} />
      : <p role="status" className={styles.mediaError}>Video {index + 1}: {VIDEO_URL_GUIDANCE}</p>}
    <span className={styles.mediaUrl} title={url}>{url}</span>
  </div>)}</div>;
}

function FilePreview({ file }: { file: File }) {
  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    const element = imageRef.current ?? videoRef.current;
    if (element) element.src = objectUrl;
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return file.type.startsWith("image/")
    ? (
      // Local blob previews do not need the Next.js image optimizer.
      // eslint-disable-next-line @next/next/no-img-element
      <img ref={imageRef} alt={file.name} width={150} height={120} className={styles.mediaPreview} />
    )
    : <><video ref={videoRef} controls playsInline preload="metadata" aria-label={`Preview ${file.name}`} className={styles.mediaPreview} onError={() => setFailed(true)} onLoadedData={() => setFailed(false)} />{failed && <p role="status" className={styles.mediaError}>This browser cannot play this file. Export it as an MP4 with H.264 and select it again.</p>}</>;
}

export default function ProductMediaFiles({ files, onRemove, disabled }: { files: File[]; onRemove: (index: number) => void; disabled: boolean }) {
  return <div className={styles.mediaFiles}>{files.map((file, index) => <div className={styles.mediaFile} key={`${file.name}-${file.lastModified}-${index}`}>
    <FilePreview file={file} /><span>{file.name}</span><button type="button" className={styles.secondary} disabled={disabled} onClick={() => onRemove(index)} aria-label={`Remove ${file.name}`}>Remove</button>
  </div>)}</div>;
}
