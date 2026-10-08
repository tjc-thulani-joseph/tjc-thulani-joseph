import { useState, type ReactNode, type ImgHTMLAttributes } from "react";

/**
 * Image with an elegant fallback: a failed or missing source renders the
 * fallback instead of a broken-image icon.
 */
export function SafeImage({
  src,
  alt,
  className,
  fallback = null,
  ...props
}: {
  src: string | null;
  alt: string;
  className?: string;
  fallback?: ReactNode;
} & Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt" | "onError">) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) return <>{fallback}</>;
  return <img loading="lazy" {...props} src={src} alt={alt} onError={() => setFailedSrc(src)} className={className} />;
}
