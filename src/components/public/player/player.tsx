import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX, X } from "lucide-react";
import { SafeImage } from "@/components/public/home/safe-image";
import { externalMediaProvider, isDirectMediaUrl, resolveMedia } from "@/lib/media";
import type { ContentRecord } from "@/types";

export interface Track {
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
  src: string;
  cover: string | null;
}

/** Builds a playable track from a published song record; null when it has no in-site audio. */
export function songToTrack(item: ContentRecord): Track | null {
  const metadata = (item.metadata ?? {}) as Record<string, unknown>;
  const uploaded = resolveMedia(metadata, "audio", item.url);
  const external = metadata["audio_url"];
  const src =
    uploaded && !externalMediaProvider(uploaded)
      ? uploaded
      : isDirectMediaUrl(external)
        ? (external as string)
        : null;
  if (!src) return null;
  return {
    id: item.id,
    title: item.title ?? "Untitled",
    artist: typeof metadata["artist"] === "string" ? (metadata["artist"] as string) : null,
    album: typeof metadata["album"] === "string" ? (metadata["album"] as string) : null,
    src,
    cover: resolveMedia(metadata, "cover", item.thumbnail_url),
  };
}

interface PlayerState {
  queue: Track[];
  index: number;
  playing: boolean;
  current: Track | null;
  playQueue: (tracks: Track[], startId?: string) => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  close: () => void;
}

const PlayerContext = createContext<PlayerState | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside PlayerProvider");
  return ctx;
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const current = queue[index] ?? null;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (audio.src !== current.src) audio.src = current.src;
    if (playing) void audio.play().catch(() => setPlaying(false));
    else audio.pause();
  }, [current, playing]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = muted;
    }
  }, [volume, muted]);

  const playQueue = useCallback((tracks: Track[], startId?: string) => {
    if (tracks.length === 0) return;
    const start = Math.max(0, startId ? tracks.findIndex((t) => t.id === startId) : 0);
    setQueue(tracks);
    setIndex(start);
    setPlaying(true);
  }, []);

  const next = useCallback(() => {
    setIndex((i) => {
      if (i + 1 < queue.length) return i + 1;
      setPlaying(false);
      return i;
    });
  }, [queue.length]);

  const previous = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const value = useMemo<PlayerState>(
    () => ({
      queue,
      index,
      playing,
      current,
      playQueue,
      toggle: () => setPlaying((p) => !p),
      next,
      previous,
      close: () => {
        setPlaying(false);
        setQueue([]);
        audioRef.current?.pause();
      },
    }),
    [queue, index, playing, current, playQueue, next, previous],
  );

  const fmt = (s: number) =>
    Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00";

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        preload="metadata"
        onEnded={next}
        onPlay={() => setPlaying(true)}
        onPause={() => {
          if (!audioRef.current?.ended) setPlaying(false);
        }}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        className="hidden"
      />
      {current && (
        <>
          <div aria-hidden className="h-24" />
          <div
            role="region"
            aria-label="Music player"
            className="fixed inset-x-0 bottom-0 z-50 border-t border-gold/30 bg-background/95 backdrop-blur-xl"
          >
            <input
              type="range"
              aria-label="Seek"
              min={0}
              max={duration || 0}
              step={0.1}
              value={time}
              onChange={(e) => {
                if (audioRef.current) audioRef.current.currentTime = Number(e.target.value);
              }}
              className="absolute inset-x-0 -top-1.5 h-1.5 w-full cursor-pointer accent-[var(--gold)]"
            />
            <div className="container-tjc flex items-center gap-4 py-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {current.cover ? (
                  <SafeImage src={current.cover} alt="" className="size-14 shrink-0 rounded-md object-cover" />
                ) : (
                  <div className="size-14 shrink-0 rounded-md bg-gold/15" />
                )}
                <div className="min-w-0">
                  <p className="truncate font-display font-semibold">{current.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[current.artist, current.album].filter(Boolean).join(" · ") || `Track ${index + 1} of ${queue.length}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={previous} aria-label="Previous track" className="rounded-full p-2 hover:text-gold">
                  <SkipBack className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={value.toggle}
                  aria-label={playing ? "Pause" : "Play"}
                  className="btn-gold grid size-12 place-items-center rounded-full text-primary-foreground"
                >
                  {playing ? <Pause className="size-5" /> : <Play className="size-5 translate-x-px" />}
                </button>
                <button
                  type="button"
                  onClick={next}
                  disabled={index + 1 >= queue.length}
                  aria-label="Next track"
                  className="rounded-full p-2 hover:text-gold disabled:opacity-40"
                >
                  <SkipForward className="size-5" />
                </button>
              </div>
              <div className="hidden flex-1 items-center justify-end gap-3 sm:flex">
                <span className="font-mono text-xs text-muted-foreground">
                  {fmt(time)} / {fmt(duration)}
                </span>
                <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? "Unmute" : "Mute"} className="hover:text-gold">
                  {muted || volume === 0 ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
                </button>
                <input
                  type="range"
                  aria-label="Volume"
                  min={0}
                  max={1}
                  step={0.01}
                  value={muted ? 0 : volume}
                  onChange={(e) => {
                    setVolume(Number(e.target.value));
                    setMuted(false);
                  }}
                  className="w-24 accent-[var(--gold)]"
                />
                <button type="button" onClick={value.close} aria-label="Close player" className="text-muted-foreground hover:text-gold">
                  <X className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </PlayerContext.Provider>
  );
}
