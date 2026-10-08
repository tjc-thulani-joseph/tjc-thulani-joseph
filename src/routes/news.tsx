import { createFileRoute } from "@tanstack/react-router";
import { PublishedCollection } from "@/components/public/published-collection";
import { PageHero } from "@/components/layout/page-hero";
import { PublicLayout } from "@/components/layout/public-layout";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "News — TJC | Thulani Joseph" },
      { name: "description", content: "Announcements, releases and official updates." },
      { property: "og:title", content: "News — TJC | Thulani Joseph" },
      { property: "og:description", content: "Announcements, releases and official updates." },
      { property: "og:url", content: "/news" },
    ],
    links: [{ rel: "canonical", href: "/news" }],
  }),
  component: Page,
});

function Page() {
  return (
    <PublicLayout>
      <PageHero eyebrow="Newsroom" title="News" intro="Announcements, releases and official updates." />
      <PublishedCollection resource="posts" emptyTitle="No announcements yet" emptyBody="Official announcements published from TJC OS will appear here." />
    </PublicLayout>
  );
}
