import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { PRIMARY_NAV, SECONDARY_NAV } from "@/constants/site";
import { cn } from "@/lib/utils";
import { SocialLinks } from "@/components/public/social-links";

export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled ? "surface-glass" : "bg-transparent",
      )}
    >
      <div className="container-tjc flex h-20 items-center justify-between gap-6">
        <Logo />

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "relative rounded-full px-3.5 py-2 text-sm text-muted-foreground transition-colors duration-300 hover:text-foreground",
                pathname === item.to && "text-gold",
              )}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
  <div className="flex items-center gap-3">
  <div className="hidden xl:block">
    <SocialLinks title="Follow TJC" />
  </div>

  <Button
    asChild
    variant="outline"
    size="sm"
    className="hidden hairline-gold bg-transparent text-gold hover:bg-accent sm:inline-flex"
  >
    <Link to="/auth">
      <ShieldCheck className="size-4" aria-hidden />
      TJC OS
    </Link>
  </Button>
        

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[86vw] border-border bg-background sm:w-96">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <nav aria-label="Mobile" className="mt-10 flex flex-col gap-1">
                {PRIMARY_NAV.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "rounded-lg px-3 py-3 font-display text-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                      pathname === item.to && "text-gold",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="mt-6 flex flex-wrap gap-3 border-t border-border pt-6">
                  <div className="mt-6 border-t border-border pt-6">
  <SocialLinks title="Follow TJC" />
</div>
                  {SECONDARY_NAV.map((item) => (
                    <Link key={item.to} to={item.to} className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {item.label}
                    </Link>
                  ))}
                </div>
                <Button asChild className="mt-8">
                  <Link to="/auth">Enter TJC OS</Link>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
