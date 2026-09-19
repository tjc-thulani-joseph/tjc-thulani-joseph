import { createFileRoute } from "@tanstack/react-router";
import { MediaCollection } from "@/components/public/media-collection";
import { PageHero } from "@/components/layout/page-hero";
import { PublicLayout } from "@/components/layout/public-layout";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery — TJC | Thulani Joseph" },
      { name: "description", content: "Photography from the stage, the studio and everything in between." },
      { property: "og:title", content: "Gallery — TJC | Thulani Joseph" },
      { property: "og:description", content: "Photography from the stage, the studio and everything in between." },
      { property: "og:url", content: "/gallery" },
    ],
    links: [{ rel: "canonical", href: "/gallery" }],
  }),
  component: Page,
});

function Page() {
  return (
    <PublicLayout>
      <PageHero eyebrow="Gallery" title="Gallery" intro="Photography from the stage, the studio and everything in between." />
      <MediaCollection resource="gallery" kind="image" emptyTitle="No photographs published yet" emptyBody="Photo sets added in the TJC OS Gallery Manager will appear here." />
    </PublicLayout>
  );
}
