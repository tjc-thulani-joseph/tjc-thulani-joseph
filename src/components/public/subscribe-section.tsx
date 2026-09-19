import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { services } from "@/services";
import { internalEvents } from "@/services/event-service";
import type { BaseRecord } from "@/types";

interface NewsletterRecord extends BaseRecord {
  email: string;
  source?: string | null;
}

export function SubscribeSection() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    const result = await services().repository<NewsletterRecord>("newsletter").create({
      email: email.trim().toLowerCase(),
      status: "published",
      source: "homepage",
    });
    if (result.error) {
      setState(/duplicate|already exists|unique/i.test(result.error.message) ? "success" : "error");
      return;
    }
    await internalEvents.emit({
      name: "newsletter.subscriber.created",
      entityType: "newsletter",
      entityId: result.data.id,
      source: "newsletter",
      payload: { subscriberId: result.data.id },
    });
    setState("success");
    setEmail("");
  }

  return (
    <section className="section-y border-t border-border">
      <div className="container-tjc">
        <div className="surface-panel overflow-hidden rounded-3xl p-7 sm:p-10 md:flex md:items-center md:justify-between md:gap-10">
          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.3em] text-gold">Stay connected</p>
            <h2 className="mt-3 font-display text-2xl font-semibold md:text-3xl">Join the TJC community</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Stay connected with new music, videos, projects and announcements.</p>
          </div>
          <div className="mt-7 w-full max-w-md md:mt-0">
            {state === "success" ? (
              <div role="status" className="flex items-center gap-3 rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm"><CheckCircle2 className="size-5 shrink-0 text-gold" aria-hidden /> You’re on the list. Thanks for subscribing.</div>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
                <label htmlFor="homepage-email" className="sr-only">Email address</label>
                <input id="homepage-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Your email address" disabled={state === "loading"} className="h-11 min-w-0 flex-1 rounded-full border border-border bg-background px-5 text-sm outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60" />
                <button type="submit" disabled={state === "loading"} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60">{state === "loading" ? "Subscribing…" : "Subscribe"}<ArrowRight className="size-4" aria-hidden /></button>
              </form>
            )}
            {state === "error" && <p role="alert" className="mt-3 text-sm text-destructive">We couldn’t complete your subscription. Please try again.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
