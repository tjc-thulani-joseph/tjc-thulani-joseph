import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { services } from "@/services";
import {
  externalMediaProvider,
  getExternalMediaEmbed,
  getExternalMediaLinks,
  isDirectMediaUrl,
  resolveMedia,
} from "@/lib/media";
import type { ContentRecord } from "@/types";

type Kind =
  | "audio"
  | "video"
  | "image";

interface Props {
  resource:
    | "songs"
    | "videos"
    | "gallery";
  kind: Kind;
  emptyTitle: string;
  emptyBody: string;
}

const MEDIA_KEY: Record<
  Kind,
  string
> = {
  audio: "audio",
  video: "video",
  image: "image",
};

const COVER_KEY: Record<
  Kind,
  string
> = {
  audio: "cover",
  video: "thumbnail",
  image: "image",
};

const PLATFORM_KEYS: Record<
  Kind,
  string[]
> = {
  audio: [
    "spotify_url",
    "apple_music_url",
    "soundcloud_url",
    "youtube_url",
  ],
  video: [
    "youtube_url",
    "vimeo_url",
    "tiktok_url",
    "instagram_url",
  ],
  image: [],
};

function ExternalEmbed({
  url,
}: {
  url: string;
}) {
  const embed =
    getExternalMediaEmbed(url);

  if (!embed) {
    return null;
  }

  if (
    embed.provider ===
    "tiktok"
  ) {
    return (
      <div className="flex w-full justify-center bg-black">
        <iframe
          src={embed.url}
          title={embed.title}
          loading="lazy"
          allow={embed.allow}
          allowFullScreen={
            embed.allowFullScreen
          }
          className="aspect-[9/16] w-full max-w-[420px] border-0"
        />
      </div>
    );
  }

  if (
    embed.provider ===
    "spotify"
  ) {
    return (
      <iframe
        src={embed.url}
        title={embed.title}
        loading="lazy"
        allow={embed.allow}
        allowFullScreen={
          embed.allowFullScreen
        }
        className="h-[152px] w-full border-0"
      />
    );
  }

  return (
    <div className="aspect-video w-full bg-black">
      <iframe
        src={embed.url}
        title={embed.title}
        loading="lazy"
        allow={embed.allow}
        allowFullScreen={
          embed.allowFullScreen
        }
        className="h-full w-full border-0"
      />
    </div>
  );
}

function DirectAudio({
  src,
}: {
  src: string;
}) {
  return (
    <audio
      controls
      preload="none"
      src={src}
      className="mt-5 w-full"
    />
  );
}

function DirectVideo({
  src,
  poster,
}: {
  src: string;
  poster: string | null;
}) {
  return (
    <video
      controls
      preload="metadata"
      className="aspect-video w-full bg-black object-cover"
      {...(poster
        ? { poster }
        : {})}
    >
      <source src={src} />
    </video>
  );
}

/**
 * Public renderer for media content.
 *
 * Media can originate from:
 *
 * 1. TJC Storage uploads
 * 2. Direct media URLs
 * 3. Supported external platforms
 *
 * External platform page URLs are never passed
 * directly into native <audio>/<video> elements.
 *
 * Published content continues through the same
 * repository/RLS visibility boundary as the rest
 * of the public site.
 */
export function MediaCollection({
  resource,
  kind,
  emptyTitle,
  emptyBody,
}: Props) {
  const query = useQuery({
    queryKey: [
      "public",
      resource,
    ],
    queryFn: () =>
      services()
        .repository<ContentRecord>(
          resource,
        )
        .list({
          status: "published",
          perPage: 48,
          orderBy:
            "published_at",
        }),
  });

  if (query.isPending) {
    return (
      <section className="container-tjc section-y">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map(
            (i) => (
              <Skeleton
                key={i}
                className="h-56 w-full rounded-2xl"
              />
            ),
          )}
        </div>
      </section>
    );
  }

  const items =
    query.data?.data
      ?.items ?? [];

  if (
    query.data?.error ||
    items.length === 0
  ) {
    return (
      <EmptyState
        title={emptyTitle}
        body={emptyBody}
      />
    );
  }

  return (
    <section className="container-tjc section-y">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(
          (item) => {
            const metadata =
              (item.metadata ??
                {}) as Record<
                string,
                unknown
              >;

            const media =
              resolveMedia(
                metadata,
                MEDIA_KEY[kind],
                item.url,
              );

            const cover =
              resolveMedia(
                metadata,
                COVER_KEY[kind],
                item.thumbnail_url,
              );

            const externalSource =
              kind === "audio"
                ? metadata.audio_url
                : kind === "video"
                  ? metadata.video_url
                  : null;

            const externalProvider =
              externalMediaProvider(
                externalSource,
              );

            const directExternalMedia =
              isDirectMediaUrl(
                externalSource,
              )
                ? (externalSource as string)
                : null;

            const uploadedMedia =
              media &&
              !externalMediaProvider(
                media,
              )
                ? media
                : null;

            const providerEmbed =
              externalSource &&
              typeof externalSource ===
                "string"
                ? getExternalMediaEmbed(
                    externalSource,
                  )
                : null;

            const artist =
              typeof metadata.artist ===
              "string"
                ? metadata.artist
                : null;

            const album =
              typeof metadata.album ===
              "string"
                ? metadata.album
                : null;

            const platformLinks =
              getExternalMediaLinks(
                metadata,
                PLATFORM_KEYS[kind],
              );

            return (
              <article
                key={item.id}
                className="surface-panel flex h-full flex-col overflow-hidden rounded-2xl"
              >
                {kind ===
                  "image" &&
                  media && (
                    <img
                      src={media}
                      alt={
                        item.title ??
                        ""
                      }
                      loading="lazy"
                      className="aspect-[4/5] w-full object-cover"
                    />
                  )}

                {kind ===
                  "video" && (
                  <>
                    {uploadedMedia ? (
                      <DirectVideo
                        src={
                          uploadedMedia
                        }
                        poster={
                          cover
                        }
                      />
                    ) : providerEmbed ? (
                      <ExternalEmbed
                        url={
                          externalSource as string
                        }
                      />
                    ) : directExternalMedia ? (
                      <DirectVideo
                        src={
                          directExternalMedia
                        }
                        poster={
                          cover
                        }
                      />
                    ) : (
                      cover && (
                        <img
                          src={cover}
                          alt={
                            item.title ??
                            ""
                          }
                          loading="lazy"
                          className="aspect-video w-full object-cover"
                        />
                      )
                    )}
                  </>
                )}

                {kind ===
                  "audio" &&
                  cover && (
                    <img
                      src={cover}
                      alt={
                        item.title ??
                        ""
                      }
                      loading="lazy"
                      className="aspect-square w-full object-cover"
                    />
                  )}

                <div className="flex flex-1 flex-col p-6">
                  {item.category && (
                    <p className="text-xs uppercase tracking-[0.28em] text-gold">
                      {item.category}
                    </p>
                  )}

                  <h2 className="mt-3 font-display text-xl font-semibold">
                    {item.title ??
                      "Untitled"}
                  </h2>

                  {(artist ||
                    album) && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[
                        artist,
                        album,
                      ]
                        .filter(
                          Boolean,
                        )
                        .join(
                          " · ",
                        )}
                    </p>
                  )}

                  {item.description && (
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {
                        item.description
                      }
                    </p>
                  )}

                  {kind ===
                    "audio" &&
                    (uploadedMedia ? (
                      <DirectAudio
                        src={
                          uploadedMedia
                        }
                      />
                    ) : providerEmbed ? (
                      <div className="mt-5 overflow-hidden rounded-xl border border-border">
                        <ExternalEmbed
                          url={
                            externalSource as string
                          }
                        />
                      </div>
                    ) : directExternalMedia ? (
                      <DirectAudio
                        src={
                          directExternalMedia
                        }
                      />
                    ) : null)}

                  {externalProvider ===
                    "apple-music" && (
                    <p className="mt-4 text-xs text-muted-foreground">
                      Apple Music is linked
                      here and reserved
                      for the MusicKit Web
                      playback integration.
                    </p>
                  )}

                  {externalProvider ===
                    "instagram" && (
                    <p className="mt-4 text-xs text-muted-foreground">
                      Instagram content is
                      linked here until its
                      current official Meta
                      embed integration is
                      added.
                    </p>
                  )}

                  {platformLinks.length >
                    0 && (
                    <div className="mt-6 border-t border-border pt-5">
                      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                        Also available on
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {platformLinks.map(
                          (link) => (
                            <a
                              key={
                                link.key
                              }
                              href={
                                link.url
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs font-medium transition-colors hover:border-gold hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {
                                link.label
                              }

                              <ArrowUpRight
                                className="size-3"
                                aria-hidden
                              />
                            </a>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          },
        )}
      </div>
    </section>
  );
}
