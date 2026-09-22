import { Link, type LinkProps } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function SectionHeading({
  eyebrow,
  title,
  intro,
  linkTo,
  linkLabel,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  linkTo?: LinkProps["to"];
  linkLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.32em] text-gold">{eyebrow}</p>
        <h2 className="mt-4 font-display text-3xl font-semibold leading-tight md:text-4xl">{title}</h2>
        {intro && <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">{intro}</p>}
      </div>
      {linkTo && linkLabel && (
        <Link
          to={linkTo}
          className="group inline-flex items-center gap-2 pb-1 text-xs uppercase tracking-[0.22em] text-gold"
        >
          {linkLabel}
          <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
        </Link>
      )}
    </div>
  );
}

/** Compact placeholder shown while a homepage section checks for content. */
export function SectionSkeleton() {
  return (
    <section className="section-y border-t border-border">
      <div className="container-tjc space-y-8">
        <div className="space-y-4">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-9 w-72 max-w-full" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="hidden h-56 w-full rounded-2xl sm:block" />
          <Skeleton className="hidden h-56 w-full rounded-2xl lg:block" />
        </div>
      </div>
    </section>
  );
}
