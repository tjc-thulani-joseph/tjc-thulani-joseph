import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, Disc3, Film, Images, Sparkles } from "lucide-react";
import heroBackdrop from "@/assets/hero-backdrop.jpg";
import { PublicLayout } from "@/components/layout/public-layout";
import { HomepageContent, NewsletterSignup, StoryAndContact } from "@/components/public/homepage-content";
import { Button } from "@/components/ui/button";
import { SITE } from "@/constants/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TJC | Thulani Joseph — Official Site" },
      { name: "description", content: SITE.description },
      { property: "og:title", content: "TJC | Thulani Joseph — Official Site" },
      { property: "og:description", content: SITE.description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
      <section className="home-hero relative isolate overflow-hidden">
        <img
          src={heroBackdrop}
          alt=""
          width={1920}
          height={1088}
          fetchPriority="high"
          className="home-hero-image absolute inset-0 -z-10 size-full object-cover opacity-75"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-background/45 via-background/70 to-background"
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/65 to-transparent" />

        <div className="container-tjc flex min-h-[calc(100svh-5rem)] flex-col justify-center py-16 sm:py-24">
          <p className="animate-rise text-xs uppercase tracking-[0.32em] text-gold">TJC · Thulani Joseph</p>
          <h1 className="animate-rise mt-6 max-w-5xl font-display text-5xl font-semibold leading-[1.02] sm:text-6xl md:text-7xl lg:text-8xl">
            Stories felt.<br /><span className="text-gold-gradient">Stories lived.</span>
          </h1>
          <p className="animate-rise mt-7 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
            South African emotional storyteller, actor and rapper. Music, performance and visual worlds shaped by real life.
          </p>

          <div className="animate-rise mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[0.7rem] uppercase tracking-[0.2em] text-foreground/80 sm:gap-x-8">
            <span>Emotional storyteller</span><span className="text-gold" aria-hidden>·</span>
            <span>Emotional actor</span><span className="text-gold" aria-hidden>·</span>
            <span>Emotional rapper</span>
          </div>

          <div className="animate-rise mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full px-7">
              <Link to="/music">
                Hear the music
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-border bg-transparent px-7 text-foreground hover:bg-secondary"
            >
              <Link to="/about">The story</Link>
            </Button>
          </div>

          <a href="#latest" className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[0.65rem] uppercase tracking-[0.24em] text-muted-foreground transition-colors hover:text-gold sm:flex">
            Explore <ArrowDown className="size-4" aria-hidden />
          </a>
        </div>
      </section>

      <div id="latest"><HomepageContent /></div>

      <StoryAndContact />

      <section className="home-section border-t border-border">
        <div className="container-tjc">
          <p className="text-xs uppercase tracking-[0.3em] text-gold">Go deeper</p>
          <h2 className="mt-4 font-display text-3xl font-semibold md:text-4xl">Explore the work</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((pillar) => (
              <Link
                key={pillar.to}
                to={pillar.to}
                className="surface-panel group rounded-lg p-7 transition-all duration-500 hover:-translate-y-1"
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
      <NewsletterSignup />
    </PublicLayout>
  );
}
