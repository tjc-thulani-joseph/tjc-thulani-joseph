import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHero } from "@/components/layout/page-hero";
import { PublicLayout } from "@/components/layout/public-layout";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Privacy Policy — TJC | Thulani Joseph" },
      { name: "description", content: "How personal information is collected, used and protected on this site." },
      { property: "og:title", content: "Privacy Policy — TJC | Thulani Joseph" },
      { property: "og:description", content: "How personal information is collected, used and protected on this site." },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: Page,
});

function Page() {
  return (
    <PublicLayout>
      <PageHero eyebrow="Legal" title="Privacy policy" intro="How personal information is collected, used and protected on this site." />
      <EmptyState title="Policy being finalised" body="The full privacy policy is being prepared and will be published here." />
    </PublicLayout>
  );
}
