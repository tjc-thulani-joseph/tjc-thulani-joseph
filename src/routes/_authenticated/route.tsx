import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { OsSidebar } from "@/components/dashboard/os-sidebar";
import { OsTopbar } from "@/components/dashboard/os-topbar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { authService } from "@/services";

/**
 * TJC OS gate. Client-only: the session lives in the browser, so SSR must not
 * attempt the check. Every route under _authenticated inherits this guard.
 */
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const session = await authService.getSession();
    if (!session) throw redirect({ to: "/auth" });
    return { session };
  },
  component: OsLayout,
});

function OsLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <OsSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <OsTopbar />
          <main className="tjc-dashboard flex-1 p-5 md:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
