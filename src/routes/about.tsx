import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { PublicLayout } from "@/components/layout/public-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { TJC_IDENTITY, TJC_PERSON_ID, TJC_PROFILE_ID } from "@/constants/identity";
import { resolveMedia } from "@/lib/media";
import { services } from "@/services";
import type { ContentRecord } from "@/types";

const ABOUT_DESCRIPTION =
  "TJC (Thulani Joseph) is a South African Emotional Storyteller, Emotional Actor and Emotional Rapper creating music, acting and visual stories inspired by real-life experiences, emotions and personal growth.";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About TJC | Thulani Joseph — Emotional Storyteller, Actor & Rapper" },
      { name: "description", content: ABOUT_DESCRIPTION },
      { name: "author", content: TJC_IDENTITY.name },
      { property: "og:title", content: "About TJC | Thulani Joseph — Emotional Storyteller, Actor & Rapper" },
      { property: "og:description", content: ABOUT_DESCRIPTION },
      { property: "og:type", content: "profile" },
      { property: "og:url", content: "/about" },
      { property: "og:image", content: TJC_IDENTITY.image },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "About TJC | Thulani Joseph" },
      { name: "twitter:description", content: ABOUT_DESCRIPTION },
      { name: "twitter:image", content: TJC_IDENTITY.image },
    ],
    links: [{ rel: "canonical", href: "/about" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          "@id": TJC_PROFILE_ID,
          url: "/about",
          name: "About TJC | Thulani Joseph",
          description: ABOUT_DESCRIPTION,
          mainEntity: { "@id": TJC_PERSON_ID },
          image: TJC_IDENTITY.image,
        }),
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const biography = useQuery({
    queryKey: ["public", "biography"],
    queryFn: () =>
      services().repository<ContentRecord>("biography").list({
        status: "published",
        perPage: 1,
        orderBy: "updated_at",
      }),
    staleTime: 30_000,
  });

  const record = biography.data?.data?.items[0] ?? null;
  const metadata = record?.metadata ?? {};
  const profileImage = record
    ? resolveMedia(metadata, "profile_image", record.thumbnail_url)
    : null;
  const tags = typeof metadata.tags === "string" ? metadata.tags : null;
  const title = record?.title || "TJC — Thulani Joseph";
  const description = record?.description || ABOUT_DESCRIPTION;

  return (
    <PublicLayout>
      <header className="relative overflow-hidden border-b border-border">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: "var(--gradient-halo)" }} />
        <div className="container-tjc relative section-y">
          <p className="text-xs uppercase tracking-[0.32em] text-gold">{record?.category || "About TJC"}</p>
          {biography.isPending ? (
            <div className="mt-5 space-y-4">
              <Skeleton className="h-14 w-3/4" />
              <Skeleton className="h-6 w-full max-w-3xl" />
            </div>
          ) : (
            <>
              <h1 className="mt-5 max-w-4xl font-display text-4xl font-semibold leading-[1.05] md:text-6xl">{title}</h1>
              <p className="mt-6 max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">{description}</p>
            </>
          )}
          <p className="mt-5 text-sm uppercase tracking-[0.18em] text-gold">{TJC_IDENTITY.tagline}</p>
          {profileImage && (
            <img src={profileImage} alt={record?.title || TJC_IDENTITY.name} className="mt-8 max-h-96 rounded-2xl object-cover" />
          )}
        </div>
      </header>

      <main className="container-tjc section-y">
        <div className="mx-auto max-w-3xl space-y-14">
          {biography.error && (
            <p role="alert" className="rounded-xl border border-destructive/40 p-4 text-sm text-destructive">
              Biography content could not be loaded. Showing the available public identity content.
            </p>
          )}
          {!biography.isPending && !biography.error && !record && (
            <EmptyState title="No published biography yet" body="The public biography will appear here once it is published from TJC OS." />
          )}

          <section aria-labelledby="who-is-tjc">
            <h2 id="who-is-tjc" className="font-display text-3xl font-semibold md:text-4xl">Who Is TJC?</h2>
            <div className="mt-6 space-y-5 text-base leading-8 text-muted-foreground">
              {record?.body ? (
                <p className="whitespace-pre-line">{record.body}</p>
              ) : (
                <>
                  <p>
                    TJC and Thulani Joseph are the same person. At the heart of TJC’s journey is real-life storytelling:
                    telling stories that come from genuine experiences, emotions, lessons, challenges, healing, ambition
                    and the transformation that comes with becoming who you are meant to be.
                  </p>
                  <p>
                    This is more than an artist identity. It is an evolving story of self-growth, struggles, dreams,
                    ambition, healing, transformation and becoming.
                  </p>
                </>
              )}
            </div>
            {tags && <p className="mt-6 text-xs uppercase tracking-[0.2em] text-gold">{tags}</p>}
          </section>

          <section aria-labelledby="emotional-storytelling">
            <h2 id="emotional-storytelling" className="font-display text-3xl font-semibold md:text-4xl">Emotional Storytelling</h2>
            <p className="mt-6 text-base leading-8 text-muted-foreground">
              TJC turns real emotions and real experiences into meaningful stories. Music, acting and visual work
              connect through a human approach that leaves room for honesty, feeling and connection.
            </p>
          </section>

          <section aria-labelledby="emotional-rapper">
            <h2 id="emotional-rapper" className="font-display text-3xl font-semibold md:text-4xl">Emotional Rapper</h2>
            <p className="mt-6 text-base leading-8 text-muted-foreground">
              As an Emotional Rapper, TJC combines emotional rap, melodic flows and heart-touching choruses to create
              music that feels personal, honest and relatable.
            </p>
          </section>

          <section aria-labelledby="emotional-actor">
            <h2 id="emotional-actor" className="font-display text-3xl font-semibold md:text-4xl">Emotional Actor</h2>
            <p className="mt-6 text-base leading-8 text-muted-foreground">
              As an Emotional Actor, he uses performance to bring real emotions and human experiences to life. Acting
              is not simply playing a character; it is another way of telling stories people can feel and connect with.
            </p>
          </section>

          <section aria-labelledby="creative-work">
            <h2 id="creative-work" className="font-display text-3xl font-semibold md:text-4xl">Visual Storytelling &amp; Creative Work</h2>
            <p className="mt-6 text-base leading-8 text-muted-foreground">
              Beyond music and acting, TJC continues to explore filmmaking, visual storytelling, digital creativity and
              other creative projects. Every form of expression connects to the same purpose: turning real emotions and
              real experiences into meaningful stories.
            </p>
          </section>

          <section aria-labelledby="official-links" className="border-t border-border pt-10">
            <h2 id="official-links" className="font-display text-3xl font-semibold md:text-4xl">Official TJC Links</h2>
            <p className="mt-6 text-base leading-8 text-muted-foreground">
              Visit the official links directory for public destinations managed for TJC / Thulani Joseph. Only
              confirmed destinations are published there.
            </p>
            <Link to="/links" className="mt-6 inline-flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-gold hover:text-foreground">
              View official links <ArrowRight className="size-4" aria-hidden />
            </Link>
          </section>

          <nav aria-label="Explore TJC's public work" className="border-t border-border pt-10">
            <p className="text-xs uppercase tracking-[0.28em] text-gold">Explore the work</p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <Link to="/music" className="hover:text-foreground">Music</Link>
              <Link to="/videos" className="hover:text-foreground">Videos</Link>
              <Link to="/projects" className="hover:text-foreground">Creative projects</Link>
              <Link to="/gallery" className="hover:text-foreground">Gallery</Link>
              <Link to="/blog" className="hover:text-foreground">Blog</Link>
              <Link to="/news" className="hover:text-foreground">News</Link>
              <Link to="/contact" className="hover:text-foreground">Contact TJC</Link>
            </div>
          </nav>
        </div>
      </main>
    </PublicLayout>
  );
}
