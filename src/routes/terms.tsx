import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHero } from "@/components/layout/page-hero";
import { PublicLayout } from "@/components/layout/public-layout";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Terms of Use — TJC | Thulani Joseph" },
      { name: "description", content: "The terms that govern the use of this website and its content." },
      { property: "og:title", content: "Terms of Use — TJC | Thulani Joseph" },
      { property: "og:description", content: "The terms that govern the use of this website and its content." },
      { property: "og:url", content: "/terms" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: Page,
});

function Page() {
  return (
    <PublicLayout>
      <PageHero eyebrow="Legal" title="Terms of use" intro="The terms that govern the use of this website and its content." />
      <EmptyState title="Terms being finalised" body="The full terms of use are being prepared and will be published here." />
    </PublicLayout>
  );
}
