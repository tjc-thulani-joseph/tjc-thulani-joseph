import { createFileRoute } from "@tanstack/react-router";
import { PublishedCollection } from "@/components/public/published-collection";
import { PageHero } from "@/components/layout/page-hero";
import { PublicLayout } from "@/components/layout/public-layout";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Blog — TJC | Thulani Joseph" },
      { name: "description", content: "Notes, essays and reflections written by Thulani Joseph." },
      { property: "og:title", content: "Blog — TJC | Thulani Joseph" },
      { property: "og:description", content: "Notes, essays and reflections written by Thulani Joseph." },
      { property: "og:url", content: "/blog" },
    ],
    links: [{ rel: "canonical", href: "/blog" }],
  }),
  component: Page,
});

function Page() {
  return (
    <PublicLayout>
      <PageHero eyebrow="Journal" title="Blog" intro="Notes, essays and reflections written by Thulani Joseph." />
      <PublishedCollection resource="posts" emptyTitle="No posts published yet" emptyBody="Posts written in the TJC OS Blog Manager will be published here." />
    </PublicLayout>
  );
}
