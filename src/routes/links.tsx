import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/layout/page-hero";
import { PublicLayout } from "@/components/layout/public-layout";
import { SocialLinks } from "@/components/public/social-links";

export const Route = createFileRoute("/links")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        title: "Links — TJC | Thulani Joseph",
      },
      {
        name: "description",
        content:
          "Every official channel and platform in one place.",
      },
      {
        property: "og:title",
        content: "Links — TJC | Thulani Joseph",
      },
      {
        property: "og:description",
        content:
          "Every official channel and platform in one place.",
      },
      {
        property: "og:url",
        content: "/links",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "/links",
      },
    ],
  }),

  component: Page,
});

function Page() {
  return (
    <PublicLayout>
      <PageHero
        eyebrow="Official Links"
        title="All links"
        intro="Every official TJC channel and platform in one place."
      />

      <SocialLinks mode="directory" />
    </PublicLayout>
  );
}
