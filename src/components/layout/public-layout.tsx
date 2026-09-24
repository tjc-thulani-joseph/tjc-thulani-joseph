import type { ReactNode } from "react";

import {
  PublicSiteMetadata,
} from "@/components/public/site-settings";

import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicSiteMetadata />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-gold focus:px-4 focus:py-2 focus:text-gold-foreground"
      >
        Skip to content
      </a>

      <SiteHeader />

      <main
        id="main"
        className="flex-1 pt-20"
      >
        {children}
      </main>

      <SiteFooter />
    </div>
  );
}
