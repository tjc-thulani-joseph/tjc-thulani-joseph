import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DASHBOARD_MODULES } from "@/config/dashboard-modules";
import { INTEGRATIONS } from "@/config/integrations";
import { useAuth } from "@/contexts/auth-context";

export function OverviewModule() {
  const { session } = useAuth();
  const quick = DASHBOARD_MODULES.filter((m) => m.group === "Content").slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-xs uppercase tracking-[0.28em] text-gold">TJC OS</p>
      <h1 className="mt-3 font-display text-3xl font-semibold">
        {session?.user.displayName ? `Welcome back, ${session.user.displayName}` : "Command centre"}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Every part of the public brand is managed from here.
      </p>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold">Quick actions</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quick.map((module) => (
            <Link
              key={module.slug}
              to="/dashboard/$module"
              params={{ module: module.slug }}
              className="surface-panel group rounded-2xl p-6 transition-transform duration-500 hover:-translate-y-1"
            >
              <div className="flex items-center justify-between">
                <module.icon className="size-5 text-gold" aria-hidden />
                <ArrowUpRight className="size-4 text-muted-foreground transition-colors group-hover:text-gold" aria-hidden />
              </div>
              <h3 className="mt-5 font-display text-base font-semibold">{module.label}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{module.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-lg font-semibold">Integration architecture</h2>
        <Card className="mt-5 surface-panel border-border">
          <CardHeader>
            <CardTitle className="text-base font-medium">Prepared adapters</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {INTEGRATIONS.map((integration) => (
              <Badge key={integration.key} variant="outline" className="border-border text-muted-foreground">
                {integration.label}
                <span className="ml-2 text-[0.65rem] uppercase tracking-[0.18em] text-gold/70">
                  {integration.enabled ? "on" : "ready"}
                </span>
              </Badge>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
