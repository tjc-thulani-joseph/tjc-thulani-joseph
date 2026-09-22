import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Disc3, Film, Images, Sparkles } from "lucide-react";
import heroBackdrop from "@/assets/hero-backdrop.jpg";
import { PublicLayout } from "@/components/layout/public-layout";
import { usePublished, featuredFirst, formatDate, meta } from "@/components/public/home/home-data";
import { Reveal } from "@/components/public/home/reveal";
import { SafeImage } from "@/components/public/home/safe-image";
import { SectionHeading } from "@/components/public/home/section-heading";
import { Button } from "@/components/ui/button";
import { resolveMedia } from "@/lib/media";
import { SITE } from "@/constants/site";
import type { ContentRecord } from "@/types";

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

function imageFor(item: ContentRecord, key: "cover" | "thumbnail" | "image") {
  const metadata = item.metadata ?? {};
  return resolveMedia(metadata, key, item.thumbnail_url);
}

function ContentFallback() {
  return (
    <div className="flex size-full items-center justify-center bg-[radial-gradient(circle_at_top_right,color-mix(in_oklab,var(--gold)_18%,transparent),transparent_58%)]">
      <span className="font-display text-4xl text-gold/60" aria-hidden>TJC</span>
    </div>
  );
}

function ContentMeta({ item }: { item: ContentRecord }) {
  const date = formatDate(item.published_at);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
      {item.category && <span className="text-gold">{item.category}</span>}
      {item.category && date && <span aria-hidden>·</span>}
      {date && <time dateTime={item.published_at ?? undefined}>{date}</time>}
    </div>
  );
}

function EditorialCard({ item, to, kind = "thumbnail" }: { item: ContentRecord; to: "/music" | "/videos" | "/gallery" | "/projects" | "/blog"; kind?: "cover" | "thumbnail" | "image" }) {
  const image = imageFor(item, kind);
  return (
    <Link to={to} className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
      <article className="surface-panel h-full overflow-hidden rounded-2xl transition-all duration-500 group-hover:-translate-y-1 group-hover:border-gold/40 group-hover:shadow-[var(--shadow-gold)]">
        <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
          <SafeImage src={image} alt={image ? (item.title ?? "TJC creative work") : ""} className="size-full object-cover transition-transform duration-700 group-hover:scale-105" fallback={<ContentFallback />} />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/75 via-transparent to-transparent" />
        </div>
        <div className="p-5 sm:p-6">
          <ContentMeta item={item} />
          <h3 className="mt-3 font-display text-xl font-semibold leading-tight">{item.title ?? "Untitled"}</h3>
          {item.description && <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>}
          <span className="mt-5 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold">Explore <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden /></span>
        </div>
      </article>
    </Link>
  );
}

function FeaturedContent({ music, videos, gallery, projects, posts }: { music: ContentRecord[]; videos: ContentRecord[]; gallery: ContentRecord[]; projects: ContentRecord[]; posts: ContentRecord[] }) {
  const featured = [
    ...(featuredFirst(videos).slice(0, 1).map((item) => ({ item, to: "/videos" as const, kind: "thumbnail" as const, label: "Visual story" }))),
    ...(featuredFirst(music).slice(0, 1).map((item) => ({ item, to: "/music" as const, kind: "cover" as const, label: "Latest sound" }))),
    ...(featuredFirst(projects).slice(0, 1).map((item) => ({ item, to: "/projects" as const, kind: "thumbnail" as const, label: "In progress" }))),
    ...(featuredFirst(gallery).slice(0, 1).map((item) => ({ item, to: "/gallery" as const, kind: "image" as const, label: "From the frame" }))),
    ...(featuredFirst(posts).slice(0, 1).map((item) => ({ item, to: "/blog" as const, kind: "thumbnail" as const, label: "Latest note" }))),
  ];
  if (featured.length === 0) return null;
  const lead = featured[0];

  return (
    <section className="section-y border-t border-border">
      <div className="container-tjc">
        <Reveal><SectionHeading eyebrow="Now at TJC" title="In the world of TJC" intro="A glimpse at the music, images, stories and ideas moving through the creative world." /></Reveal>
        <div className="mt-10 grid gap-5 lg:grid-cols-[1.45fr_0.8fr]">
          <Reveal className="h-full">
            <Link to={lead.to} className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
              <article className="surface-panel relative h-full min-h-[28rem] overflow-hidden rounded-2xl">
                <SafeImage src={imageFor(lead.item, lead.kind)} alt={lead.item.title ?? "Featured TJC work"} className="absolute inset-0 size-full object-cover transition-transform duration-1000 group-hover:scale-105" fallback={<ContentFallback />} />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/35 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-7 sm:p-10">
                  <p className="text-xs uppercase tracking-[0.32em] text-gold">{lead.label}</p>
                  <h3 className="mt-3 max-w-2xl font-display text-3xl font-semibold leading-tight sm:text-5xl">{lead.item.title ?? "Untitled"}</h3>
                  {lead.item.description && <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">{lead.item.description}</p>}
                  <span className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold">Discover <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden /></span>
                </div>
              </article>
            </Link>
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
            {featured.slice(1, 3).map((entry, index) => <Reveal key={entry.item.id} delay={(index + 1) * 80}><EditorialCard item={entry.item} to={entry.to} kind={entry.kind} /></Reveal>)}
          </div>
        </div>
      </div>
    </section>
  );
}

function ContentSection({ items, title, eyebrow, intro, to, label, kind = "thumbnail" }: { items: ContentRecord[]; title: string; eyebrow: string; intro: string; to: "/music" | "/videos" | "/gallery" | "/projects" | "/blog"; label: string; kind?: "cover" | "thumbnail" | "image" }) {
  if (items.length === 0) return null;
  return (
    <section className="section-y border-t border-border">
      <div className="container-tjc">
        <Reveal><SectionHeading eyebrow={eyebrow} title={title} intro={intro} linkTo={to} linkLabel={label} /></Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.slice(0, 3).map((item, index) => <Reveal key={item.id} delay={index * 70} className="h-full"><EditorialCard item={item} to={to} kind={kind} /></Reveal>)}
        </div>
      </div>
    </section>
  );
}

function HomePage() {
  const music = usePublished("songs", 6);
  const videos = usePublished("videos", 6);
  const gallery = usePublished("gallery", 6);
  const projects = usePublished("projects", 6);
  const posts = usePublished("posts", 6);

  return (
    <PublicLayout>
      <section className="relative isolate overflow-hidden">
        <img src={heroBackdrop} alt="" width={1920} height={1088} fetchPriority="high" className="absolute inset-0 -z-10 size-full object-cover opacity-70" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_75%_20%,color-mix(in_oklab,var(--gold)_14%,transparent),transparent_32%)]" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-background/65 via-background/80 to-background" />
        <div className="container-tjc flex min-h-[80vh] flex-col justify-center py-24">
          <p className="animate-rise text-xs uppercase tracking-[0.4em] text-gold">Official site · TJC</p>
          <h1 className="animate-rise mt-6 max-w-4xl font-display text-5xl font-semibold leading-[1.02] md:text-7xl">Thulani <span className="text-gold-gradient">Joseph</span></h1>
          <p className="animate-rise mt-7 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">{SITE.tagline} Music, film, photography and the projects being built — gathered in one place.</p>
          <div className="animate-rise mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full px-7"><Link to="/about">The story <ArrowRight className="size-4" aria-hidden /></Link></Button>
            <Button asChild size="lg" variant="outline" className="rounded-full border-border bg-transparent px-7 text-foreground hover:bg-secondary"><Link to="/contact">Work with me</Link></Button>
          </div>
          <a href="#discover" className="animate-rise mt-16 inline-flex w-fit items-center gap-3 text-xs uppercase tracking-[0.25em] text-muted-foreground transition-colors hover:text-gold">Discover the work <ArrowRight className="size-3.5 rotate-90" aria-hidden /></a>
        </div>
      </section>

      <div id="discover"><FeaturedContent music={music.items} videos={videos.items} gallery={gallery.items} projects={projects.items} posts={posts.items} /></div>

      <section className="section-y border-t border-border">
        <div className="container-tjc">
          <Reveal><SectionHeading eyebrow="The world of TJC" title="Explore the work" intro="Move through the music, images and ideas that make up the TJC universe." /></Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((pillar, index) => <Reveal key={pillar.to} delay={index * 70}><Link to={pillar.to} className="surface-panel group relative block h-full overflow-hidden rounded-2xl p-7 transition-all duration-500 hover:-translate-y-1 hover:border-gold/40 hover:shadow-[var(--shadow-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"><span className="absolute right-6 top-6 font-display text-5xl text-foreground/[0.04]" aria-hidden>0{index + 1}</span><pillar.icon className="size-6 text-gold transition-transform duration-500 group-hover:scale-110" aria-hidden /><h3 className="mt-8 font-display text-lg font-semibold">{pillar.label}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{pillar.copy}</p><span className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold">Open <ArrowRight className="size-3 transition-transform duration-300 group-hover:translate-x-1" aria-hidden /></span></Link></Reveal>)}
          </div>
        </div>
      </section>

      <ContentSection items={music.items} eyebrow="Latest release" title="Music" intro="The latest sounds and releases from the studio." to="/music" label="View all music" kind="cover" />
      <ContentSection items={videos.items} eyebrow="On screen" title="Visual stories" intro="Performances, films and moving images from the TJC world." to="/videos" label="View all videos" />
      <ContentSection items={gallery.items} eyebrow="From the frame" title="The visual world" intro="Photography from the stage, the studio and everything in between." to="/gallery" label="Enter the gallery" kind="image" />
      <ContentSection items={projects.items} eyebrow="In progress" title="Featured projects" intro="Creative ventures and collaborations taking shape now." to="/projects" label="Explore projects" />
      <ContentSection items={posts.items} eyebrow="From the journal" title="Latest from TJC" intro="Notes, announcements and reflections from the journey." to="/blog" label="Read the journal" />

      <section className="section-y border-t border-border">
        <div className="container-tjc grid gap-10 lg:grid-cols-[1fr_0.8fr] lg:items-end">
          <Reveal><p className="text-xs uppercase tracking-[0.32em] text-gold">The story</p><h2 className="mt-4 max-w-2xl font-display text-3xl font-semibold leading-tight md:text-5xl">An emotional storyteller, actor and rapper.</h2><p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">South African by origin and storyteller by instinct, TJC moves between music, acting, visual storytelling and the creative work that connects them.</p><Link to="/about" className="mt-7 inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-gold">Read the story <ArrowRight className="size-3.5" aria-hidden /></Link></Reveal>
          <Reveal delay={100}><div className="surface-panel rounded-2xl p-7 sm:p-9"><p className="text-xs uppercase tracking-[0.28em] text-gold">Create with TJC</p><h3 className="mt-4 font-display text-2xl font-semibold">Bring a meaningful idea to life.</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">For bookings, collaborations, press and creative conversations.</p><Button asChild className="mt-7 rounded-full px-6"><Link to="/contact">Start a conversation <ArrowRight className="size-4" aria-hidden /></Link></Button></div></Reveal>
        </div>
      </section>
    </PublicLayout>
  );
}
