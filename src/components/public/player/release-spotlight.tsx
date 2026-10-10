import { Link } from "@tanstack/react-router";
import { ArrowRight, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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

const ROTATE_MS = 6000;

function dateOf(item: ContentRecord) {
  const raw = (item.metadata ?? {})["release_date"];
  return typeof raw === "string" && raw ? raw : (item.published_at ?? item.created_at ?? "");
}

const newest = (items: ContentRecord[]) => [...items].sort((a, b) => dateOf(b).localeCompare(dateOf(a)));

/** Auto-rotating live spotlight cycling through the newest real published records; hidden when nothing is published. */
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

  const count = latestByKind.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const reducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (count < 2 || paused || reducedMotion) return;
    timer.current = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [count, paused, reducedMotion]);

  const goTo = useCallback((i: number) => setIndex(i), []);

  if (!count) return null;
  const active = index % count;
  const [kind, item] = latestByKind[active];
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
    <section
      aria-label="Latest releases"
      aria-roledescription="carousel"
      className="relative overflow-hidden border-b border-gold/25 bg-gradient-to-r from-background via-card to-background"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="container-tjc relative flex flex-col gap-5 py-6 sm:flex-row sm:items-center">
        {cover && (
          <SafeImage
            key={item.id}
            src={cover}
            alt={`${item.title ?? "Release"} cover`}
            className="size-24 shrink-0 animate-spotlight-in rounded-lg object-cover shadow-lg ring-1 ring-gold/40"
          />
        )}
        <div key={item.id} className="min-w-0 flex-1 animate-spotlight-in">
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
          <Link
            to={cfg.to}
            className="inline-flex h-12 items-center gap-2 rounded-md border border-border px-5 text-sm font-medium hover:border-gold hover:text-gold"
          >
            {kind === "song" ? "Listen" : kind === "video" ? "Watch" : "Open"} <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
      {count > 1 && (
        <div className="container-tjc flex items-center gap-2 pb-4" role="tablist" aria-label="Release slides">
          {latestByKind.map(([k, rec], i) => (
            <button
              key={rec.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`${KIND[k].badge}: ${rec.title ?? "Untitled"}`}
              onClick={() => goTo(i)}
              className="group flex h-6 items-center"
            >
              <span
                className={`h-1 rounded-full transition-all duration-500 ${
                  i === active ? "w-10 bg-gold" : "w-4 bg-border group-hover:bg-gold/50"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
