import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { PageHero } from "@/components/layout/page-hero";
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { services } from "@/services";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Contact — TJC | Thulani Joseph" },
      { name: "description", content: "Bookings, collaborations, press and general enquiries for Thulani Joseph." },
      { property: "og:title", content: "Contact — TJC | Thulani Joseph" },
      { property: "og:description", content: "Bookings, collaborations, press and general enquiries." },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: ContactPage,
});

const contactSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(100),
  email: z.string().trim().email("Enter a valid email address").max(255),
  subject: z.string().trim().min(1, "Please add a subject").max(150),
  message: z.string().trim().min(10, "Please write at least 10 characters").max(2000),
});

function ContactPage() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = contactSchema.safeParse(Object.fromEntries(form));

    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }

    setErrors({});
    setSubmitting(true);
    const result = await services().repository("contacts").create(parsed.data as never);
    setSubmitting(false);

    if (result.error) {
      toast.error("Message not sent", { description: result.error.message });
      return;
    }
    toast.success("Message sent", { description: "Thank you — you'll get a reply soon." });
    event.currentTarget.reset();
  }

  const field = (name: string) =>
    errors[name] ? <p className="mt-1.5 text-xs text-destructive">{errors[name]}</p> : null;

  return (
    <PublicLayout>
      <PageHero
        eyebrow="Contact"
        title="Start a conversation"
        intro="Bookings, collaborations, press and general enquiries — send a note and it lands directly in TJC OS."
      />
      <section className="container-tjc section-y">
        <form onSubmit={handleSubmit} noValidate className="surface-panel mx-auto max-w-2xl rounded-2xl p-8 md:p-10">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" autoComplete="name" maxLength={100} className="mt-2" />
              {field("name")}
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" maxLength={255} className="mt-2" />
              {field("email")}
            </div>
          </div>
          <div className="mt-5">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" name="subject" maxLength={150} className="mt-2" />
            {field("subject")}
          </div>
          <div className="mt-5">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" name="message" rows={6} maxLength={2000} className="mt-2" />
            {field("message")}
          </div>
          <Button type="submit" disabled={submitting} className="mt-8 w-full rounded-full sm:w-auto sm:px-10">
            {submitting ? "Sending…" : "Send message"}
          </Button>
        </form>
      </section>
    </PublicLayout>
  );
}
