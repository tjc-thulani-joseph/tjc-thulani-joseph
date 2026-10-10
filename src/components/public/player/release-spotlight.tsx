import { Link } from "@tanstack/react-router";
import { ArrowRight, Pause, Play } from "lucide-react";
import { SafeImage } from "@/components/public/home/safe-image";
import { formatDate } from "@/components/public/home/home-data";
import { resolveMedia } from "@/lib/media";
import type { ContentRecord } from "@/types";
import { songToTrack, usePlayer } from "./player";

type Kind = "song" | "video" | "post" | "project";

const KIND: Record<Kind, { badge: string; to: "/music" | "/videos" | "/blog" | "/projects"; cover: string }> = {
  song: { badge: "Hot Song", to: "/music", cover: "cover" },
  video: { badge: "New Video", to: "/videos", cover: "thumbnail" },
  post: { badge: "Latest Story", to: "/blog", cover: "featured_image" },
  project: { badge: "New Release", to: "/projects", cover: "featured_image" },
};

function dateOf(item: ContentRecord) {
  const raw = (item.metadata ?? {})["release_date"];
  return typeof raw === "string" && raw ? raw : (item.published_at ?? item.created_at ?? "");
}

const newest = (items: ContentRecord[]) => [...items].sort((a, b) => dateOf(b).localeCompare(dateOf(a)));

/** Spotlight for the newest real published record across content types; hidden when nothing is published. */
export function ReleaseSpotlight({
  songs,
  videos,
  posts,
  projects,
}: {
  songs: ContentRecord[];
  videos: ContentRecord[];
  posts: ContentRecord[];
  projects: ContentRecord[];
}) {
  const player = usePlayer();
  const sortedSongs = newest(songs);
  const latestByKind = (
    [
      ["song", sortedSongs[0]],
      ["video", newest(videos)[0]],
      ["post", newest(posts)[0]],
      ["project", newest(projects)[0]],
    ] as [Kind, ContentRecord | undefined][]
  )
    .filter((e): e is [Kind, ContentRecord] => Boolean(e[1]))
    .sort((a, b) => dateOf(b[1]).localeCompare(dateOf(a[1])));

  const top = latestByKind[0];
  if (!top) return null;
  const [kind, item] = top;
  const cfg = KIND[kind];
  const meta = (item.metadata ?? {}) as Record<string, unknown>;
  const cover = resolveMedia(meta, cfg.cover, item.thumbnail_url);
  const date = dateOf(item);
  const year = date ? new Date(date).getFullYear() : null;
  const artist = typeof meta["artist"] === "string" ? meta["artist"] : null;
  const tracks = sortedSongs.map(songToTrack).filter((t): t is NonNullable<typeof t> => t !== null);
  const track = kind === "song" ? songToTrack(item) : null;
  const isCurrent = player.current?.id === item.id;

  return (
    <section aria-label="Latest release" className="border-b border-gold/25 bg-gradient-to-r from-background via-card to-background">
      <div className="container-tjc flex flex-col gap-5 py-6 sm:flex-row sm:items-center">
        {cover && (
          <SafeImage src={cover} alt={`${item.title ?? "Release"} cover`} className="size-24 shrink-0 rounded-lg object-cover shadow-lg ring-1 ring-gold/40" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gold px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-gold-foreground">
              {cfg.badge}
            </span>
            {year && (
              <span className="rounded-full border border-gold/50 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-gold">
                {year} · Hot now
              </span>
            )}
          </div>
          <h2 className="mt-3 truncate font-display text-2xl font-bold sm:text-3xl">{item.title ?? "Untitled"}</h2>
          <p className="text-sm text-muted-foreground">{[artist, formatDate(date)].filter(Boolean).join(" · ")}</p>
          {latestByKind.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {latestByKind.slice(1).map(([k, rec]) => (
                <Link key={rec.id} to={KIND[k].to} className="inline-flex max-w-[16rem] items-center gap-1 truncate rounded-full border border-border px-3 py-1 text-xs hover:border-gold hover:text-gold">
                  <span className="font-semibold text-gold">{KIND[k].badge}:</span>
                  <span className="truncate">{rec.title ?? "Untitled"}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-3">
          {track && (
            <button
              type="button"
              onClick={() => (isCurrent ? player.toggle() : player.playQueue(tracks, item.id))}
              className="btn-gold inline-flex h-12 items-center gap-2 rounded-md px-6 font-semibold text-primary-foreground"
            >
              {isCurrent && player.playing ? <Pause className="size-4" /> : <Play className="size-4" />}
              {isCurrent && player.playing ? "Pause" : "Play now"}
            </button>
          )}
          <Link to={cfg.to} className="inline-flex h-12 items-center gap-2 rounded-md border border-border px-5 text-sm font-medium hover:border-gold hover:text-gold">
            {kind === "song" ? "Listen" : kind === "video" ? "Watch" : "Open"} <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
