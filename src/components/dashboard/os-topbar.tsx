import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Bot, LogOut, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/auth-context";
import { getModule } from "@/config/dashboard-modules";

export function OsTopbar() {
  const { session, signOut, atLeast, loading } = useAuth();
  const aiModule = getModule("ai");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const initials = (session?.user.displayName ?? session?.user.email ?? "TJ").slice(0, 2).toUpperCase();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
      <SidebarTrigger />
      <div className="relative hidden max-w-sm flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input placeholder="Search TJC OS" className="pl-9" aria-label="Search TJC OS" />
      </div>
      <div className="ml-auto flex items-center gap-2">
        {!loading && aiModule && atLeast(aiModule.minRole) && (
          <Button asChild variant="luxury" className="h-11 px-5" aria-label="Open TJC AI chat">
            <Link to="/dashboard/$module" params={{ module: "ai" }}>
              <Bot className="size-5" aria-hidden /> TJC AI
            </Link>
          </Button>
        )}
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="size-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Account menu">
              <Avatar className="size-8">
                <AvatarFallback className="bg-secondary text-xs text-gold">{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate">{session?.user.email ?? "Not signed in"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleSignOut}>
              <LogOut className="size-4" aria-hidden /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
