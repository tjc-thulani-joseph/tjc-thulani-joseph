import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Film, Images, Music2, Sparkles } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resolveMedia } from "@/lib/media";
import { services } from "@/services";
import type { ContentRecord } from "@/types";

type Feed = "songs" | "videos" | "gallery" | "projects" | "posts" | "biography";

type HomepageData = Record<Feed, ContentRecord[]>;

const FEEDS: Feed[] = ["songs", "videos", "gallery", "projects", "posts", "biography"];

async function loadHomepageData(): Promise<HomepageData> {
  const results = await Promise.all(
    FEEDS.map(async (resource) => {
      const result = await services().repository<ContentRecord>(resource).list({
        status: "published",
        perPage: resource === "gallery" ? 6 : 4,
        orderBy: "published_at",
      });
      return [resource, result.data?.items ?? []] as const;
    }),
  );

  return Object.fromEntries(results) as HomepageData;
}

export function HomepageContent() {
  const { data } = useQuery({
    queryKey: ["public", "homepage", "published"],
    queryFn: loadHomepageData,
    staleTime: 30_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  if (!data) return <HomepageLoading />;

  const song = preferFeatured(data.songs)[0];
  const moreSongs = preferFeatured(data.songs).slice(1, 4);
  const video = preferFeatured(data.videos)[0];
  const gallery = preferFeatured(data.gallery).slice(0, 5);
  const projects = preferFeatured(data.projects).slice(0, 3);
  const posts = preferFeatured(data.posts).slice(0, 3);
  const hasCurrentWork = Boolean(song || video || gallery.length || projects.length || posts.length);

  return (
    <>
      {hasCurrentWork && (
        <section className="border-y border-border bg-surface/25 py-5" aria-label="Now at TJC">
          <div className="container-tjc flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="relative flex size-2" aria-hidden>
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-gold opacity-50" />
                <span className="relative inline-flex size-2 rounded-full bg-gold" />
              </span>
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-gold">Now at TJC</p>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {song?.title ? `Now playing: ${song.title}` : "New work from the world of TJC."}
            </p>
          </div>
        </section>
      )}

      {song && <FeaturedMusic song={song} moreSongs={moreSongs} />}
      {video && <FeaturedVideo item={video} />}
      {gallery.length > 0 && <GalleryPreview items={gallery} />}
      {projects.length > 0 && <ProjectPreview items={projects} />}
      {posts.length > 0 && <UpdatesPreview items={posts} />}
    </>
  );
}

function FeaturedMusic({ song, moreSongs }: { song: ContentRecord; moreSongs: ContentRecord[] }) {
  const metadata = song.metadata ?? {};
  const cover = resolveMedia(metadata, "cover", song.thumbnail_url);
  const audio = resolveMedia(metadata, "audio", song.url);
  const artist = textValue(metadata.artist);
  const album = textValue(metadata.album);
  const releaseDate = textValue(metadata.release_date) ?? song.published_at;

  if (!audio) return null;

  return (
    <section className="home-section relative overflow-hidden" aria-labelledby="featured-music-title">
      <div className="container-tjc relative">
        <SectionHeading eyebrow="Latest music" title="A story you can hear" to="/music" linkLabel="View all music" />
        <div className="mt-10 grid items-stretch gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="relative min-h-[22rem] overflow-hidden border border-border bg-surface sm:min-h-[30rem]">
            {cover ? (
              <SafeImage src={cover} alt={song.title ?? "TJC music cover"} className="absolute inset-0 size-full object-cover" />
            ) : (
              <MediaFallback icon={<Music2 />} label="TJC music" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent" aria-hidden />
            <p className="absolute bottom-6 left-6 text-xs uppercase tracking-[0.28em] text-gold">TJC · Music</p>
          </div>

          <div className="flex flex-col justify-center border-y border-border py-9 lg:px-8">
            {song.category && <p className="text-xs uppercase tracking-[0.28em] text-gold">{song.category}</p>}
            <h2 id="featured-music-title" className="mt-4 max-w-xl font-display text-3xl font-semibold leading-tight sm:text-5xl">
              {song.title ?? "Latest release"}
            </h2>
            {(artist || album) && <p className="mt-4 text-base text-muted-foreground">{[artist, album].filter(Boolean).join(" · ")}</p>}
            {song.description && <p className="mt-6 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">{song.description}</p>}
            {releaseDate && (
              <p className="mt-6 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <CalendarDays className="size-4 text-gold" aria-hidden /> {formatDate(releaseDate)}
              </p>
            )}
            <audio controls preload="metadata" src={audio} className="mt-8 w-full max-w-xl" aria-label={`Play ${song.title ?? "TJC song"}`} />
            {moreSongs.length > 0 && (
              <div className="mt-8 border-t border-border pt-6">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">More from TJC</p>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                  {moreSongs.map((item) => <span key={item.id} className="text-sm text-foreground">{item.title}</span>)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturedVideo({ item }: { item: ContentRecord }) {
  const video = resolveMedia(item.metadata, "video", item.url);
  const poster = resolveMedia(item.metadata, "thumbnail", item.thumbnail_url);
  if (!video && !poster) return null;

  return (
    <section className="home-section border-y border-border bg-surface/20" aria-labelledby="visual-story-title">
      <div className="container-tjc">
        <SectionHeading eyebrow="Visual stories" title="See the emotion move" to="/videos" linkLabel="View all videos" />
        <div className="relative mt-10 overflow-hidden bg-surface">
          {video ? (
            <video controls preload="metadata" className="aspect-video w-full object-cover" {...(poster ? { poster } : {})} aria-label={item.title ?? "TJC visual story"}>
              <source src={video} />
            </video>
          ) : poster ? (
            <SafeImage src={poster} alt={item.title ?? "TJC visual story"} className="aspect-video w-full object-cover" />
          ) : null}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 to-transparent p-6 pt-24 sm:p-10 sm:pt-32">
            <p className="text-xs uppercase tracking-[0.26em] text-gold">{item.category ?? "Visual story"}</p>
            <h2 id="visual-story-title" className="mt-3 max-w-2xl font-display text-2xl font-semibold sm:text-4xl">{item.title}</h2>
          </div>
        </div>
      </div>
    </section>
  );
}

function GalleryPreview({ items }: { items: ContentRecord[] }) {
  const visible = items
    .map((item) => ({ item, image: resolveMedia(item.metadata, "image", item.url ?? item.thumbnail_url) }))
    .filter((entry): entry is { item: ContentRecord; image: string } => Boolean(entry.image));
  if (visible.length === 0) return null;

  return (
    <section className="home-section" aria-labelledby="gallery-preview-title">
      <div className="container-tjc">
        <SectionHeading eyebrow="The world of TJC" title="Frames from the journey" to="/gallery" linkLabel="Enter the gallery" />
        <div className="mt-10 grid auto-rows-[10rem] grid-cols-2 gap-3 sm:auto-rows-[14rem] lg:grid-cols-4 lg:grid-rows-2">
          {visible.map(({ item, image }, index) => (
            <Link
              to="/gallery"
              key={item.id}
              className={`group relative overflow-hidden bg-surface ${index === 0 ? "col-span-2 row-span-2" : ""}`}
              aria-label={`View ${item.title ?? "photograph"} in the gallery`}
            >
              <SafeImage src={image} alt={item.title ?? "TJC gallery photograph"} className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-70" aria-hidden />
              {(item.title || item.category) && (
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
                  {item.category && <p className="text-[0.65rem] uppercase tracking-[0.22em] text-gold">{item.category}</p>}
                  {item.title && <h3 className="mt-1 font-display text-sm font-medium sm:text-lg">{item.title}</h3>}
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProjectPreview({ items }: { items: ContentRecord[] }) {
  return (
    <section className="home-section border-y border-border bg-surface/20" aria-labelledby="projects-preview-title">
      <div className="container-tjc">
        <SectionHeading eyebrow="Projects in motion" title="What TJC is building" to="/projects" linkLabel="Explore projects" />
        <div className="mt-10 divide-y divide-border border-y border-border">
          {items.map((item, index) => {
            const image = resolveMedia(item.metadata, "image", item.thumbnail_url);
            return (
              <Link to="/projects" key={item.id} className="group grid gap-6 py-8 sm:grid-cols-[4rem_1fr_auto] sm:items-center">
                <span className="numeric text-sm text-gold">{String(index + 1).padStart(2, "0")}</span>
                <div className="flex items-center gap-5">
                  {image && <SafeImage src={image} alt="" className="hidden size-20 object-cover sm:block" />}
                  <div>
                    {item.category && <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{item.category}</p>}
                    <h3 className="mt-2 font-display text-xl font-semibold sm:text-2xl">{item.title}</h3>
                    {item.description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{item.description}</p>}
                  </div>
                </div>
                <ArrowRight className="hidden size-5 text-gold transition-transform group-hover:translate-x-1 sm:block" aria-hidden />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function UpdatesPreview({ items }: { items: ContentRecord[] }) {
  return (
    <section className="home-section" aria-labelledby="updates-preview-title">
      <div className="container-tjc">
        <SectionHeading eyebrow="Latest from TJC" title="Notes from the journey" to="/news" linkLabel="View all updates" />
        <div className="mt-10 grid gap-px bg-border md:grid-cols-3">
          {items.map((item) => (
            <Link to="/news" key={item.id} className="group bg-background p-7 transition-colors hover:bg-surface">
              <p className="text-xs uppercase tracking-[0.22em] text-gold">{item.category ?? "Update"}</p>
              <h3 className="mt-8 font-display text-xl font-semibold leading-snug">{item.title}</h3>
              {item.description && <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{item.description}</p>}
              {item.published_at && <p className="mt-8 text-xs text-muted-foreground">{formatDate(item.published_at)}</p>}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StoryAndContact() {
  return (
    <>
      <section className="home-section border-y border-border bg-surface/20">
        <div className="container-tjc grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gold">The story</p>
            <p className="mt-4 numeric text-sm text-muted-foreground">South Africa · TJC</p>
          </div>
          <div>
            <h2 className="max-w-4xl font-display text-3xl font-semibold leading-tight sm:text-5xl">
              Real life becomes music, performance and visual story.
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground">
              Thulani Joseph is a South African emotional storyteller, actor and rapper — creating from lived experience.
            </p>
            <Button asChild variant="link" className="mt-7 h-auto p-0 text-gold">
              <Link to="/about">Discover the story <ArrowRight aria-hidden /></Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="container-tjc text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-gold">Create with TJC</p>
          <h2 className="mx-auto mt-5 max-w-4xl font-display text-3xl font-semibold leading-tight sm:text-5xl">Let the next story begin.</h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted-foreground">
            For creative collaborations across music, acting, filmmaking and visual storytelling.
          </p>
          <Button asChild size="lg" className="mt-9 rounded-full px-8">
            <Link to="/contact">Work with me <ArrowRight aria-hidden /></Link>
          </Button>
        </div>
      </section>
    </>
  );
}

export function NewsletterSignup() {
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = String(new FormData(form).get("email") ?? "").trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("Enter a valid email address.");
      return;
    }
    setSubmitting(true);
    const result = await services().repository("newsletter").create({ email } as never);
    setSubmitting(false);
    if (result.error) {
      const duplicate = /duplicate|unique/i.test(result.error.message);
      toast[duplicate ? "success" : "error"](duplicate ? "You're already on the list." : "Could not join the list.", {
        description: duplicate ? "No action needed." : result.error.message,
      });
      return;
    }
    form.reset();
    toast.success("Welcome to the TJC list.");
  }

  return (
    <section className="border-y border-border bg-surface/30 py-12 sm:py-16" aria-labelledby="newsletter-title">
      <div className="container-tjc grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gold">Stay close</p>
          <h2 id="newsletter-title" className="mt-3 font-display text-2xl font-semibold sm:text-3xl">Latest work, directly from TJC.</h2>
          <p className="mt-2 text-sm text-muted-foreground">New music, visual stories and meaningful updates.</p>
        </div>
        <form onSubmit={submit} className="flex w-full max-w-xl flex-col gap-3 sm:flex-row lg:w-[32rem]" noValidate>
          <label htmlFor="home-newsletter-email" className="sr-only">Email address</label>
          <Input id="home-newsletter-email" name="email" type="email" autoComplete="email" placeholder="Email address" maxLength={255} className="h-11 rounded-full bg-background px-5" />
          <Button type="submit" disabled={submitting} className="h-11 rounded-full px-6">
            {submitting ? "Joining…" : "Join the list"}
          </Button>
        </form>
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, to, linkLabel }: { eyebrow: string; title: string; to: "/music" | "/videos" | "/gallery" | "/projects" | "/news"; linkLabel: string }) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-gold">{eyebrow}</p>
        <h2 className="mt-4 font-display text-3xl font-semibold sm:text-4xl">{title}</h2>
      </div>
      <Button asChild variant="link" className="h-auto justify-start p-0 text-gold sm:justify-center">
        <Link to={to}>{linkLabel} <ArrowRight aria-hidden /></Link>
      </Button>
    </div>
  );
}

function SafeImage({ src, alt, className }: { src: string; alt: string; className: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <MediaFallback icon={<Images />} label={alt || "TJC visual"} />;
  return <img src={src} alt={alt} loading="lazy" decoding="async" className={className} onError={() => setFailed(true)} />;
}

function MediaFallback({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex size-full min-h-48 flex-col items-center justify-center gap-3 bg-surface text-muted-foreground">
      <span className="text-gold [&_svg]:size-7" aria-hidden>{icon}</span>
      <span className="text-xs uppercase tracking-[0.22em]">{label}</span>
    </div>
  );
}

function HomepageLoading() {
  return (
    <section className="home-section" aria-label="Loading latest work">
      <div className="container-tjc grid gap-4 md:grid-cols-3">
        {[Music2, Film, Sparkles].map((Icon, index) => (
          <div key={index} className="flex h-40 animate-pulse items-center justify-center border border-border bg-surface/40">
            <Icon className="size-5 text-gold/40" aria-hidden />
          </div>
        ))}
      </div>
    </section>
  );
}

function preferFeatured(items: ContentRecord[]) {
  return [...items].sort((a, b) => Number(b.metadata?.featured === true) - Number(a.metadata?.featured === true));
}

function textValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "long", year: "numeric" }).format(date);
}