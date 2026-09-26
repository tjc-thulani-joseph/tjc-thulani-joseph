import { Link, useRouterState } from "@tanstack/react-router";
import { Logo } from "@/components/brand/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DASHBOARD_MODULES,
  type DashboardModule,
} from "@/config/dashboard-modules";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

const GROUPS: DashboardModule["group"][] = [
  "Overview",
  "Content",
  "Audience",
  "System",
];

export function OsSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { atLeast, isAuthenticated } = useAuth();

  const visible = DASHBOARD_MODULES.filter(
    (m) =>
      (!isAuthenticated || atLeast(m.minRole)) &&
      (m.group !== "System" || m.slug === "manage-center"),
  );

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="h-20 justify-center px-3">
        {collapsed ? (
          <Logo
            size={32}
            className="justify-center [&_span]:hidden"
          />
        ) : (
          <Logo size={36} />
        )}
      </SidebarHeader>

      <SidebarContent>
        {GROUPS.map((group) => {
          const items = visible.filter((m) => m.group === group);

          if (!items.length) return null;

          return (
            <SidebarGroup key={group}>
              <SidebarGroupLabel className="text-[0.65rem] uppercase tracking-[0.24em] text-gold/80">
                {group}
              </SidebarGroupLabel>

              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const to = `/dashboard/${item.slug}`;
                    const active = pathname === to;

                    return (
                      <SidebarMenuItem key={item.slug}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={item.label}
                        >
                          <Link
                            to="/dashboard/$module"
                            params={{ module: item.slug }}
                            className={cn(
                              "flex items-center gap-3",
                              active && "text-gold",
                            )}
                          >
                            <item.icon
                              className="size-4"
                              aria-hidden
                            />

                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="px-3 py-4 text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
        {!collapsed && <span>TJC OS · v1</span>}
      </SidebarFooter>
    </Sidebar>
  );
}
