import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, ExternalLink, Play } from "lucide-react";
import { services } from "@/services";
import { resolveMedia, safeExternalUrl } from "@/lib/media";
import type { ContentRecord } from "@/types";

function usePublished(resource: string, perPage: number) {
  return useQuery({
    queryKey: ["public", "homepage", resource],
    queryFn: () =>
      services().repository<ContentRecord>(resource).list({
        status: "published",
        perPage,
        orderBy: "published_at",
      }),
  });
}

function dateLabel(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function HomepageContent() {
  const music = usePublished("songs", 3);
  const videos = usePublished("videos", 1);
  const gallery = usePublished("gallery", 6);
  const projects = usePublished("projects", 2);
  const news = usePublished("posts", 3);

  const releases = music.data?.data?.items ?? [];
  const video = videos.data?.data?.items?.[0];
  const visuals = gallery.data?.data?.items ?? [];
  const projectItems = projects.data?.data?.items ?? [];
  const updates = news.data?.data?.items ?? [];

  return (
    <div className="border-t border-border">
      {releases.length > 0 && (
        <section className="section-y" aria-labelledby="featured-music">
          <div className="container-tjc">
            <SectionHeading eyebrow="Featured music" title="Listen to what’s next" link="/music" />
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {releases.map((item) => {
                const metadata = item.metadata ?? {};
                const cover = resolveMedia(metadata, "cover", item.thumbnail_url);
                const audio = resolveMedia(metadata, "audio", item.url);
                return (
                  <article key={item.id} className="surface-panel overflow-hidden rounded-2xl">
                    {cover && <img src={cover} alt={`${item.title ?? "Release"} artwork`} loading="lazy" className="aspect-square w-full object-cover" />}
                    <div className="p-6">
                      <p className="text-xs uppercase tracking-[0.25em] text-gold">{item.category ?? "Release"}</p>
                      <h3 className="mt-3 font-display text-xl font-semibold">{item.title ?? "Untitled release"}</h3>
                      {typeof metadata.artist === "string" && <p className="mt-1 text-sm text-muted-foreground">{metadata.artist}</p>}
                      {item.description && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.description}</p>}
                      {audio ? <audio controls preload="none" src={audio} className="mt-5 w-full" aria-label={`Play ${item.title ?? "release"}`} /> : <Link to="/music" className="mt-5 inline-flex items-center gap-2 text-sm text-gold">Listen now <ArrowRight className="size-4" aria-hidden /></Link>}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {video && (
        <section className="section-y border-t border-border" aria-labelledby="featured-video">
          <div className="container-tjc">
            <SectionHeading eyebrow="Featured video" title={video.title ?? "Watch the latest"} link="/videos" />
            <div className="mt-10 overflow-hidden rounded-2xl border border-border bg-black">
              {(() => {
                const poster = resolveMedia(video.metadata ?? {}, "thumbnail", video.thumbnail_url);
                const source = safeExternalUrl(video.url) ?? resolveMedia(video.metadata ?? {}, "video", null);
                if (source) {
                  return <video controls preload="metadata" poster={poster ?? undefined} className="aspect-video w-full" aria-label={video.title ?? "Featured video"}><source src={source} /></video>;
                }
                if (poster) return <img src={poster} alt={video.title ?? "Featured video"} loading="lazy" className="aspect-video w-full object-cover" />;
                return <div className="flex aspect-video items-center justify-center text-muted-foreground"><Play className="mr-2 size-5" aria-hidden /> Watch on the videos page</div>;
              })()}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {video.category && <span className="text-gold">{video.category}</span>}
              {dateLabel(video.published_at) && <span>{dateLabel(video.published_at)}</span>}
              {safeExternalUrl(video.url) && <a href={safeExternalUrl(video.url) ?? undefined} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 text-gold">Open video <ExternalLink className="size-4" aria-hidden /></a>}
            </div>
          </div>
        </section>
      )}

      {visuals.length > 0 && (
        <section className="section-y border-t border-border" aria-labelledby="latest-visuals">
          <div className="container-tjc">
            <SectionHeading eyebrow="Latest visuals" title="A look behind the work" link="/gallery" />
            <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3">
              {visuals.map((item, index) => {
                const image = resolveMedia(item.metadata ?? {}, "image", item.thumbnail_url);
                return image ? <Link key={item.id} to="/gallery" className={`group overflow-hidden rounded-2xl border border-border ${index === 0 ? "col-span-2 row-span-2" : ""}`}><img src={image} alt={item.title ?? "TJC gallery photograph"} loading="lazy" className="aspect-square size-full object-cover transition duration-500 group-hover:scale-105" /></Link> : null;
              })}
            </div>
          </div>
        </section>
      )}

      {projectItems.length > 0 && (
        <section className="section-y border-t border-border" aria-labelledby="latest-projects">
          <div className="container-tjc">
            <SectionHeading eyebrow="Coming into focus" title="Projects in motion" link="/projects" />
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {projectItems.map((item) => <Link key={item.id} to="/projects" className="surface-panel group rounded-2xl p-6 transition hover:-translate-y-1"><div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.25em] text-gold">{item.category ?? "Project"}</p><h3 className="mt-3 font-display text-xl font-semibold">{item.title ?? "Untitled project"}</h3></div><ArrowRight className="size-5 text-gold transition group-hover:translate-x-1" aria-hidden /></div>{item.description && <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{item.description}</p>}</Link>)}
            </div>
          </div>
        </section>
      )}

      {updates.length > 0 && (
        <section className="section-y border-t border-border" aria-labelledby="latest-updates">
          <div className="container-tjc">
            <SectionHeading eyebrow="From the journal" title="Latest updates" link="/news" />
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {updates.map((item) => <Link key={item.id} to="/news" className="surface-panel group rounded-2xl p-6"><div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold"><CalendarDays className="size-4" aria-hidden />{dateLabel(item.published_at) ?? "Update"}</div><h3 className="mt-4 font-display text-xl font-semibold group-hover:text-gold">{item.title ?? "Untitled update"}</h3>{item.description && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{item.description}</p>}</Link>)}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHeading({ eyebrow, title, link }: { eyebrow: string; title: string; link: "/music" | "/videos" | "/gallery" | "/projects" | "/news" }) {
  return <div className="flex items-end justify-between gap-5"><div><p className="text-xs uppercase tracking-[0.3em] text-gold">{eyebrow}</p><h2 className="mt-3 font-display text-2xl font-semibold md:text-3xl">{title}</h2></div><Link to={link} className="inline-flex shrink-0 items-center gap-2 text-sm text-gold">View all <ArrowRight className="size-4" aria-hidden /></Link></div>;
}
