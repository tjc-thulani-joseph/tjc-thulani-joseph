import { Link } from "@tanstack/react-router";
import { Pause, Play } from "lucide-react";
import { SafeImage } from "@/components/public/home/safe-image";
import { formatDate } from "@/components/public/home/home-data";
import type { ContentRecord } from "@/types";
import { songToTrack, usePlayer } from "./player";

function releaseDate(item: ContentRecord) {
  const raw = (item.metadata ?? {})["release_date"];
  return typeof raw === "string" && raw ? raw : (item.published_at ?? item.created_at);
}

/** Spotlight for the newest real published song; renders nothing when none exist. */
export function ReleaseSpotlight({ songs }: { songs: ContentRecord[] }) {
  const player = usePlayer();
  const sorted = [...songs].sort((a, b) => (releaseDate(b) ?? "").localeCompare(releaseDate(a) ?? ""));
  const latest = sorted[0];
  if (!latest) return null;
  const tracks = sorted.map(songToTrack).filter((t): t is NonNullable<typeof t> => t !== null);
  const track = songToTrack(latest);
  const date = releaseDate(latest);
  const year = date ? new Date(date).getFullYear() : null;
  const isCurrent = player.current?.id === latest.id;
  const meta = latest.metadata ?? {};
  const artist = typeof meta["artist"] === "string" ? meta["artist"] : null;

  return (
    <section aria-label="Latest release" className="border-b border-gold/25 bg-gradient-to-r from-background via-card to-background">
      <div className="container-tjc flex flex-col gap-5 py-6 sm:flex-row sm:items-center">
        {track?.cover && (
          <SafeImage src={track.cover} alt={`${latest.title ?? "Release"} cover art`} className="size-24 shrink-0 rounded-lg object-cover shadow-lg ring-1 ring-gold/40" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gold px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-gold-foreground">
              {year ? `${year} New Release` : "New Release"}
            </span>
            <span className="rounded-full border border-gold/50 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-gold">
              Hot now
            </span>
          </div>
          <h2 className="mt-3 truncate font-display text-2xl font-bold sm:text-3xl">{latest.title ?? "Untitled"}</h2>
          <p className="text-sm text-muted-foreground">
            {[artist, formatDate(date)].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex gap-3">
          {track && (
            <button
              type="button"
              onClick={() => (isCurrent ? player.toggle() : player.playQueue(tracks, latest.id))}
              className="btn-gold inline-flex h-12 items-center gap-2 rounded-md px-6 font-semibold text-primary-foreground"
            >
              {isCurrent && player.playing ? <Pause className="size-4" /> : <Play className="size-4" />}
              {isCurrent && player.playing ? "Pause" : "Play now"}
            </button>
          )}
          <Link to="/music" className="inline-flex h-12 items-center rounded-md border border-border px-5 text-sm font-medium hover:border-gold hover:text-gold">
            Listen
          </Link>
        </div>
      </div>
    </section>
  );
}
