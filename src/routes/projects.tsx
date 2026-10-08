import { createFileRoute } from "@tanstack/react-router";
import { PublishedCollection } from "@/components/public/published-collection";
import { PageHero } from "@/components/layout/page-hero";
import { PublicLayout } from "@/components/layout/public-layout";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Projects — TJC | Thulani Joseph" },
      { name: "description", content: "Creative ventures, collaborations and work currently in progress." },
      { property: "og:title", content: "Projects — TJC | Thulani Joseph" },
      { property: "og:description", content: "Creative ventures, collaborations and work currently in progress." },
      { property: "og:url", content: "/projects" },
    ],
    links: [{ rel: "canonical", href: "/projects" }],
  }),
  component: Page,
});

function Page() {
  return (
    <PublicLayout>
      <PageHero eyebrow="Projects" title="Projects" intro="Creative ventures, collaborations and work currently in progress." />
      <PublishedCollection resource="projects" emptyTitle="No projects published yet" emptyBody="Projects added in TJC OS will appear here as they are made public." />
    </PublicLayout>
  );
}
