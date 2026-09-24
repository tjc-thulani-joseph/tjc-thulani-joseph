import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/logo";
import { PRIMARY_NAV, SECONDARY_NAV, SITE } from "@/constants/site";


export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface/40">
      <div className="container-tjc flex flex-col gap-10 py-14 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <Logo size={44} />
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{SITE.tagline}</p>
        </div>
        

        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
          <nav aria-label="Footer" className="flex flex-col gap-2.5">
            <h2 className="mb-1 text-xs uppercase tracking-[0.24em] text-gold">Explore</h2>
            {PRIMARY_NAV.slice(1).map((item) => (
              <Link key={item.to} to={item.to} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </nav>
          <nav aria-label="Legal" className="flex flex-col gap-2.5">
            <h2 className="mb-1 text-xs uppercase tracking-[0.24em] text-gold">More</h2>
            {SECONDARY_NAV.map((item) => (
              <Link key={item.to} to={item.to} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {item.label}
              </Link>
            ))}
            <Link to="/auth" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              TJC OS
            </Link>
          </nav>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="container-tjc flex flex-col gap-2 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="numeric">© {new Date().getFullYear()} {SITE.fullName}</p>
          <p className="uppercase tracking-[0.22em]">Powered by {SITE.system}</p>
        </div>
      </div>
    </footer>
  );
}
