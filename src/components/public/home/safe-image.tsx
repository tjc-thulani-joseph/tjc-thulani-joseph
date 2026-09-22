import { useState, type ReactNode } from "react";

/**
 * Image with an elegant fallback: a failed or missing source renders the
 * fallback instead of a broken-image icon.
 */
export function SafeImage({
  src,
  alt,
  className,
  fallback = null,
}: {
  src: string | null;
  alt: string;
  className?: string;
  fallback?: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <>{fallback}</>;
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={className} />;
}
