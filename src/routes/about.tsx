import { createFileRoute } from "@tanstack/react-router";
import { PublishedCollection } from "@/components/public/published-collection";
import { PageHero } from "@/components/layout/page-hero";
import { PublicLayout } from "@/components/layout/public-layout";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — TJC | Thulani Joseph" },
      { name: "description", content: "The life, the influences and the path behind the work of Thulani Joseph." },
      { property: "og:title", content: "About — TJC | Thulani Joseph" },
      { property: "og:description", content: "The life, the influences and the path behind the work of Thulani Joseph." },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: Page,
});

function Page() {
  return (
    <PublicLayout>
      <PageHero eyebrow="About" title="The story so far" intro="The life, the influences and the path behind the work of Thulani Joseph." />
      <PublishedCollection resource="biography" emptyTitle="Biography coming soon" emptyBody="The full biography, timeline and achievements are published from TJC OS and will appear here." showBody />
    </PublicLayout>
  );
}
