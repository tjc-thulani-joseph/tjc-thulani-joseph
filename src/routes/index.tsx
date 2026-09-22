import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Disc3, Film, Images, Sparkles } from "lucide-react";
import heroBackdrop from "@/assets/hero-backdrop.jpg";
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { SITE } from "@/constants/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TJC | Thulani Joseph — Official Site" },
      { name: "description", content: SITE.description },
      { property: "og:title", content: "TJC | Thulani Joseph — Official Site" },
      { property: "og:description", content: SITE.description },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: HomePage,
});

const PILLARS = [
  { icon: Disc3, label: "Music", to: "/music", copy: "Releases, albums and the sound behind the name." },
  { icon: Film, label: "Videos", to: "/videos", copy: "Visual work, performances and film." },
  { icon: Images, label: "Gallery", to: "/gallery", copy: "Photography from the stage and the studio." },
  { icon: Sparkles, label: "Projects", to: "/projects", copy: "Creative ventures and work in progress." },
] as const;

function HomePage() {
  return (
    <PublicLayout>
      <section className="relative isolate overflow-hidden">
        <img
          src={heroBackdrop}
          alt=""
          width={1920}
          height={1088}
          className="absolute inset-0 -z-10 size-full object-cover opacity-70"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-background/70 via-background/80 to-background"
        />

        <div className="container-tjc flex min-h-[80vh] flex-col justify-center py-24">
          <p className="animate-rise text-xs uppercase tracking-[0.4em] text-gold">Official site</p>
          <h1 className="animate-rise mt-6 max-w-4xl font-display text-5xl font-semibold leading-[1.02] md:text-7xl">
            Thulani <span className="text-gold-gradient">Joseph</span>
          </h1>
          <p className="animate-rise mt-7 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            {SITE.tagline} Music, film, photography and the projects being built — gathered in one place.
          </p>

          <div className="animate-rise mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full px-7">
              <Link to="/about">
                The story
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-border bg-transparent px-7 text-foreground hover:bg-secondary"
            >
              <Link to="/contact">Work with me</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="section-y border-t border-border">
        <div className="container-tjc">
          <h2 className="font-display text-2xl font-semibold md:text-3xl">Explore the work</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((pillar) => (
              <Link
                key={pillar.to}
                to={pillar.to}
                className="surface-panel group rounded-2xl p-7 transition-all duration-500 hover:-translate-y-1"
              >
                <pillar.icon className="size-6 text-gold" aria-hidden />
                <h3 className="mt-6 font-display text-lg font-semibold">{pillar.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{pillar.copy}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  Open <ArrowRight className="size-3" aria-hidden />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
