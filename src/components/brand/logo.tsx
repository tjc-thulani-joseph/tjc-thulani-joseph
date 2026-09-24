import { Link } from "@tanstack/react-router";

import logo from "@/assets/tjc-logo.png.asset.json";
import { usePublicSiteSettings } from "@/components/public/site-settings";
import { SITE } from "@/constants/site";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  size = 40,
}: {
  className?: string;
  size?: number;
}) {
  const { settings } = usePublicSiteSettings();

  const imageUrl = settings.logoUrl || logo.url;
  const siteName = settings.siteName || SITE.name;

  return (
    <Link
      to="/"
      className={cn(
        "group inline-flex items-center gap-3",
        className,
      )}
      aria-label={`${siteName} — home`}
    >
      <img
        src={imageUrl}
        alt=""
        width={size}
        height={size}
        className="rounded-md object-cover transition-transform duration-500 group-hover:scale-105"
        style={{
          width: size,
          height: size,
        }}
      />

      <span className="flex flex-col leading-none">
        <span className="font-display text-sm font-semibold tracking-[0.32em] text-gold-gradient">
          TJC
        </span>

        <span className="mt-1 text-[0.65rem] uppercase tracking-[0.24em] text-muted-foreground">
          {siteName}
        </span>
      </span>
    </Link>
  );
}
