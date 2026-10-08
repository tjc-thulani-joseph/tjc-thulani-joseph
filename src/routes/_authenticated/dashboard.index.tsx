import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({ meta: [
    { title: "Command centre — TJC OS" },
    { name: "description", content: "Thulani Joseph's private TJC OS command centre." },
    { property: "og:title", content: "Command centre — TJC OS" },
    { property: "og:description", content: "Thulani Joseph's private TJC OS command centre." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/$module", params: { module: "overview" } });
  },
});
