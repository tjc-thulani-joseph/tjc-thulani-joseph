import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Disc3,
  Film,
  Images,
  Sparkles,
} from "lucide-react";
import heroBackdrop from "@/assets/hero-backdrop.jpg";
import { PublicLayout } from "@/components/layout/public-layout";
import {
  usePublished,
  usePublishedHomepageSections,
  featuredFirst,
  formatDate,
} from "@/components/public/home/home-data";
import { Reveal } from "@/components/public/home/reveal";
import { HomepageQuickLinks } from "@/components/public/social-links";
import { SafeImage } from "@/components/public/home/safe-image";
import { SectionHeading } from "@/components/public/home/section-heading";
import { Button } from "@/components/ui/button";
import {
  resolveMedia,
  safeExternalUrl,
} from "@/lib/media";
import { SITE } from "@/constants/site";
import type { ContentRecord } from "@/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TJC | Thulani Joseph — Official Site" },
      { name: "description", content: SITE.description },
      {
        property: "og:title",
        content: "TJC | Thulani Joseph — Official Site",
      },
      {
        property: "og:description",
        content: SITE.description,
      },
      {
        property: "og:url",
        content: "/",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "/",
      },
    ],
  }),
  component: HomePage,
});

/*
 * TJC OS — PERMANENT PUBLIC HOMEPAGE SHELL
 *
 * This file owns the public homepage experience.
 *
 * The homepage consumes real published content only.
 *
 * Homepage Builder records now enter the public experience
 * through the same publication boundary as every other CMS
 * resource:
 *
 *   status = published
 *   AND deleted_at IS NULL
 *
 * Database RLS remains the final public security boundary.
 */

const PUBLIC_PILLARS = [
  {
    icon: Disc3,
    number: "01",
    label: "Music",
    to: "/music",
    copy: "Releases, albums and the sound behind the name.",
  },
  {
    icon: Film,
    number: "02",
    label: "Videos",
    to: "/videos",
    copy: "Visual work, performances and moving stories.",
  },
  {
    icon: Images,
    number: "03",
    label: "Gallery",
    to: "/gallery",
    copy: "Photography from the stage, studio and journey.",
  },
  {
    icon: Sparkles,
    number: "04",
    label: "Projects",
    to: "/projects",
    copy: "Creative ventures, collaborations and work in progress.",
  },
  {
    icon: BookOpen,
    number: "05",
    label: "Journal",
    to: "/blog",
    copy: "Notes, announcements and stories from the journey.",
  },
] as const;

type PublicContentRoute =
  | "/music"
  | "/videos"
  | "/gallery"
  | "/projects"
  | "/blog";

type MediaKind = "cover" | "thumbnail" | "image";

function imageFor(item: ContentRecord, key: MediaKind) {
  const metadata = item.metadata ?? {};

  return resolveMedia(
    metadata,
    key,
    item.thumbnail_url,
  );
}

function ContentFallback() {
  return (
    <div className="flex size-full items-center justify-center bg-[radial-gradient(circle_at_top_right,color-mix(in_oklab,var(--gold)_18%,transparent),transparent_58%)]">
      <span
        className="font-display text-4xl tracking-tight text-gold/60"
        aria-hidden
      >
        TJC
      </span>
    </div>
  );
}

function ContentMeta({
  item,
}: {
  item: ContentRecord;
}) {
  const date = formatDate(item.published_at);

  if (!item.category && !date) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.68rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
      {item.category && (
        <span className="text-gold">
          {item.category}
        </span>
      )}

      {item.category && date && (
        <span aria-hidden>·</span>
      )}

      {date && (
        <time dateTime={item.published_at ?? undefined}>
          {date}
        </time>
      )}
    </div>
  );
}

function EditorialCard({
  item,
  to,
  kind = "thumbnail",
}: {
  item: ContentRecord;
  to: PublicContentRoute;
  kind?: MediaKind;
}) {
  const image = imageFor(item, kind);

  return (
    <Link
      to={to}
      className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <article className="card-interactive surface-panel h-full overflow-hidden rounded-2xl">
        <div className="image-editorial relative aspect-[4/3] overflow-hidden bg-secondary">
          <SafeImage
            src={image}
            alt={
              image
                ? item.title ?? "TJC creative work"
                : ""
            }
            className="size-full object-cover"
            fallback={<ContentFallback />}
          />

          <div className="image-overlay absolute inset-0" />
        </div>

        <div className="p-5 sm:p-6">
          <ContentMeta item={item} />

          <h3 className="mt-3 font-display text-xl font-semibold leading-tight">
            {item.title ?? "Untitled"}
          </h3>

          {item.description && (
            <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          )}

          <span className="mt-5 inline-flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-gold">
            Explore
            <ArrowRight
              className="size-3.5 transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden
            />
          </span>
        </div>
      </article>
    </Link>
  );
}

/* ============================================================
   HOMEPAGE BUILDER → PUBLIC RENDERING
   ============================================================ */

function HomepageBuilderSection({
  section,
}: {
  section: ContentRecord;
}) {
  const metadata = section.metadata ?? {};

  const image = resolveMedia(
    metadata,
    "section_image",
    section.thumbnail_url,
  );

  const sectionUrl = safeExternalUrl(
    metadata.section_url,
  );

  const sectionType =
    typeof section.category === "string" &&
    section.category.trim()
      ? section.category
      : "Featured section";

  const content = (
    <article className="surface-glass group relative overflow-hidden rounded-2xl border border-border">
      {image && (
        <div className="image-editorial relative aspect-[16/7] overflow-hidden">
          <SafeImage
            src={image}
            alt={section.title ?? "TJC homepage section"}
            className="size-full object-cover"
            fallback={<ContentFallback />}
          />

          <div className="image-overlay absolute inset-0" />
        </div>
      )}

      <div className="relative p-7 sm:p-9 lg:p-11">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-gold">
            {sectionType}
          </p>

          {Boolean(metadata.featured) && (
            <>
              <span
                aria-hidden
                className="text-muted-foreground/50"
              >
                ·
              </span>

              <span className="text-[0.62rem] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                Featured
              </span>
            </>
          )}
        </div>

        <h2 className="mt-4 max-w-4xl font-display text-3xl font-semibold leading-tight md:text-5xl">
          {section.title ?? "Untitled section"}
        </h2>

        {section.description && (
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground">
            {section.description}
          </p>
        )}

        {section.body && (
          <div className="mt-5 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-foreground/75">
            {section.body}
          </div>
        )}

        {sectionUrl && (
          <span className="mt-7 inline-flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-gold">
            Explore section
            <ArrowRight
              className="size-3.5 transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden
            />
          </span>
        )}
      </div>
    </article>
  );

  if (!sectionUrl) {
    return content;
  }

  return (
    <a
      href={sectionUrl}
      target="_blank"
      rel="noreferrer"
      className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {content}
    </a>
  );
}

function HomepageBuilderSections({
  sections,
}: {
  sections: ContentRecord[];
}) {
  if (sections.length === 0) {
    return null;
  }

  return (
    <section
      id="homepage-builder"
      className="section-y border-t border-border"
    >
      <div className="container-tjc">
        <Reveal>
          <SectionHeading
            eyebrow="From the TJC HQ"
            title="Built for the moment"
            intro="A curated selection published directly through the TJC homepage system."
          />
        </Reveal>

        <div className="mt-10 space-y-5">
          {sections.map((section, index) => (
            <Reveal
              key={section.id}
              delay={index * 70}
            >
              <HomepageBuilderSection
                section={section}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function CurrentWorld({
  music,
  videos,
  gallery,
  projects,
  posts,
}: {
  music: ContentRecord[];
  videos: ContentRecord[];
  gallery: ContentRecord[];
  projects: ContentRecord[];
  posts: ContentRecord[];
}) {
  const featured = [
    ...featuredFirst(videos)
      .slice(0, 1)
      .map((item) => ({
        item,
        to: "/videos" as const,
        kind: "thumbnail" as const,
        label: "Visual story",
      })),

    ...featuredFirst(music)
      .slice(0, 1)
      .map((item) => ({
        item,
        to: "/music" as const,
        kind: "cover" as const,
        label: "Latest sound",
      })),

    ...featuredFirst(projects)
      .slice(0, 1)
      .map((item) => ({
        item,
        to: "/projects" as const,
        kind: "thumbnail" as const,
        label: "Creative project",
      })),

    ...featuredFirst(gallery)
      .slice(0, 1)
      .map((item) => ({
        item,
        to: "/gallery" as const,
        kind: "image" as const,
        label: "From the frame",
      })),

    ...featuredFirst(posts)
      .slice(0, 1)
      .map((item) => ({
        item,
        to: "/blog" as const,
        kind: "thumbnail" as const,
        label: "Latest note",
      })),
  ];

  if (featured.length === 0) {
    return null;
  }

  const lead = featured[0];

  return (
    <section
      id="current"
      className="section-y border-t border-border"
    >
      <div className="container-tjc">
        <Reveal>
          <SectionHeading
            eyebrow="The world right now"
            title="In the world of TJC"
            intro="A living selection of the music, images, stories and creative work moving through the TJC universe."
          />
        </Reveal>

        <div className="mt-10 grid gap-5 lg:grid-cols-[1.45fr_0.8fr]">
          <Reveal className="h-full">
            <Link
              to={lead.to}
              className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <article className="hero-cinematic relative h-full min-h-[30rem] overflow-hidden rounded-2xl border border-border">
                <SafeImage
                  src={imageFor(
                    lead.item,
                    lead.kind,
                  )}
                  alt={
                    lead.item.title ??
                    "Featured TJC work"
                  }
                  className="hero-backdrop-image absolute inset-0 size-full object-cover"
                  fallback={<ContentFallback />}
                />

                <div className="hero-overlay absolute inset-0" />

                <div className="absolute inset-x-0 bottom-0 p-7 sm:p-10">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-gold">
                    {lead.label}
                  </p>

                  <h3 className="mt-3 max-w-3xl font-display text-3xl font-semibold leading-[1.05] sm:text-5xl">
                    {lead.item.title ??
                      "Untitled"}
                  </h3>

                  {lead.item.description && (
                    <p className="mt-4 max-w-xl text-sm leading-relaxed text-foreground/75 sm:text-base">
                      {lead.item.description}
                    </p>
                  )}
        
