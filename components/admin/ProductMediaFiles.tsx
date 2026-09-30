"use client";

import { useEffect, useRef } from "react";
import styles from "./catalog.module.css";

function FilePreview({ file }: { file: File }) {
  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
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
    : <video ref={videoRef} controls preload="metadata" className={styles.mediaPreview} />;
}

export default function ProductMediaFiles({ files, onRemove, disabled }: { files: File[]; onRemove: (index: number) => void; disabled: boolean }) {
  return <div className={styles.mediaFiles}>{files.map((file, index) => <div className={styles.mediaFile} key={`${file.name}-${file.lastModified}-${index}`}>
    <FilePreview file={file} /><span>{file.name}</span><button type="button" className={styles.secondary} disabled={disabled} onClick={() => onRemove(index)} aria-label={`Remove ${file.name}`}>Remove</button>
  </div>)}</div>;
}
