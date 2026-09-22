import { createFileRoute, notFound } from "@tanstack/react-router";
import { DASHBOARD_MODULES, getModule } from "@/config/dashboard-modules";
import { ModuleWorkspace } from "@/components/dashboard/module-workspace";
import { OverviewModule } from "@/components/dashboard/overview-module";
import { MediaLibrary } from "@/components/dashboard/media-library";
import { MessagesManager } from "@/components/dashboard/messages-manager";
import { ContactRequestsManager } from "@/components/dashboard/contact-requests-manager";
import { ContentManager } from "@/components/dashboard/content-manager";
import { getContentSchema } from "@/config/content-schemas";
import { useAuth } from "@/contexts/auth-context";

export const Route = createFileRoute("/_authenticated/dashboard/$module")({
  beforeLoad: ({ params }) => {
    if (!getModule(params.module)) throw notFound();
  },
  head: ({ params }) => {
    const module = DASHBOARD_MODULES.find((m) => m.slug === params.module);
    return {
      meta: [
        { title: `${module?.label ?? "Module"} — TJC OS` },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: ModulePage,
});

function ModulePage() {
  const { module: slug } = Route.useParams();
  const module = getModule(slug)!;
  const { atLeast, loading } = useAuth();

  if (!loading && !atLeast(module.minRole)) {
    return (
      <div className="mx-auto max-w-6xl">
        <p className="text-xs uppercase tracking-[0.28em] text-gold">{module.group}</p>
        <h1 className="mt-3 font-display text-3xl font-semibold">{module.label}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Your account does not have permission to open this module. It requires the{" "}
          <span className="text-foreground">{module.minRole}</span> role or higher.
        </p>
      </div>
    );
  }

  if (module.slug === "overview") return <OverviewModule />;
  if (module.slug === "media") return <MediaLibrary />;
  if (module.resource === "messages") return <MessagesManager />;
  if (module.resource === "contacts") return <ContactRequestsManager />;
  const schema = getContentSchema(module.resource);
  if (schema) return <ContentManager schema={schema} description={module.description} />;
  return <ModuleWorkspace module={module} />;
}
