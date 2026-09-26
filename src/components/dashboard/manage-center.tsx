import { Link } from "@tanstack/react-router";
import {
  Activity,
  Bot,
  Globe,
  Navigation,
  Search,
  Settings,
  Share2,
  Shield,
  Workflow,
  type LucideIcon,
} from "lucide-react";

interface ManagementArea {
  slug: string;
  label: string;
  description: string;
  icon: LucideIcon;
  status: "available" | "architecture";
  moduleSlug?: string;
}

const MANAGEMENT_AREAS: ManagementArea[] = [
  {
    slug: "ai",
    label: "AI Management",
    description:
      "Manage TJC AI intelligence, conversation, voice, engines, knowledge and future AI capabilities.",
    icon: Bot,
    status: "available",
    moduleSlug: "ai-management",
  },
  {
    slug: "integrations",
    label: "Integrations",
    description:
      "Central home for external services, connections, authentication, health and controlled AI access.",
    icon: Globe,
    status: "architecture",
  },
  {
    slug: "automation",
    label: "Automation",
    description:
      "Manage scheduled and event-driven workflows that will eventually work with TJC AI.",
    icon: Workflow,
    status: "available",
    moduleSlug: "automation",
  },
  {
    slug: "security",
    label: "Security & Permissions",
    description:
      "Control roles, permissions and protected operations across TJC OS.",
    icon: Shield,
    status: "architecture",
  },
  {
    slug: "settings",
    label: "System Configuration",
    description:
      "Manage global TJC OS and website configuration.",
    icon: Settings,
    status: "available",
    moduleSlug: "settings",
  },
  {
    slug: "activity",
    label: "Activity & Audit",
    description:
      "Review the audit trail of changes and system activity.",
    icon: Activity,
    status: "available",
    moduleSlug: "activity",
  },
  {
    slug: "navigation",
    label: "Navigation",
    description:
      "Manage public and system navigation structures.",
    icon: Navigation,
    status: "available",
    moduleSlug: "navigation",
  },
  {
    slug: "seo",
    label: "SEO Management",
    description:
      "Manage search metadata, structured information and SEO configuration.",
    icon: Search,
    status: "available",
    moduleSlug: "seo",
  },
  {
    slug: "social-links",
    label: "Social Links",
    description:
      "Manage TJC's official public social and platform links.",
    icon: Share2,
    status: "available",
    moduleSlug: "social-links",
  },
];

export function ManageCenter() {
  return (
    <div className="mx-auto max-w-6xl">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-gold">
          TJC OS · Management
        </p>

        <h1 className="mt-3 font-display text-3xl font-semibold">
          TJC Manage Center
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          The central management layer for TJC OS. From here, system
          configuration, AI, integrations, automation, security and
          operational controls will be brought together under one
          controlled architecture.
        </p>
      </div>

      <section className="mt-10">
        <div className="grid gap-4 md:grid-cols-2">
          {MANAGEMENT_AREAS.map((area) => {
            const content = (
              <div className="surface-panel h-full rounded-2xl border border-border/60 p-6 transition hover:-translate-y-0.5 hover:border-gold/40">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold/20 bg-gold/10 text-gold">
                    <area.icon className="size-5" aria-hidden />
                  </div>

                  <span className="rounded-full border border-border px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {area.status === "available"
                      ? "Available"
                      : "Architecture"}
                  </span>
                </div>

                <h2 className="mt-5 font-display text-lg font-semibold">
                  {area.label}
                </h2>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {area.description}
                </p>

                <div className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-gold">
                  {area.status === "available"
                    ? "Open management"
                    : "Architecture prepared"}
                </div>
              </div>
            );

            if (area.moduleSlug) {
              return (
                <Link
                  key={area.slug}
                  to="/dashboard/$module"
                  params={{ module: area.moduleSlug }}
                  className="block"
                >
                  {content}
                </Link>
              );
            }

            return (
              <div key={area.slug} className="cursor-default">
                {content}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-border/60 bg-card/60 p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-gold">
          Architecture
        </p>

        <h2 className="mt-3 font-display text-xl font-semibold">
          One management layer
        </h2>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          TJC Manage Center is the configuration and management layer.
          TJC AI will operate through controlled tools, permissions and
          integrations rather than receiving unrestricted access to the
          database or external services.
        </p>
      </section>
    </div>
  );
}
