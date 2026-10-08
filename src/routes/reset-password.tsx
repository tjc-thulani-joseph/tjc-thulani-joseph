import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Set a new password — TJC OS" },
      { name: "description", content: "Choose a new password for your TJC OS account." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Set a new password — TJC OS" },
      { property: "og:description", content: "Choose a new password for your TJC OS account." },
    ],
  }),
  component: ResetPasswordPage,
});

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = schema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setBusy(true);
    const result = await authService.updatePassword(parsed.data.password);
    setBusy(false);
    if (result.error) {
      toast.error("Password not updated", { description: result.error.message });
      return;
    }
    toast.success("Password updated", { description: "You can now sign in with your new password." });
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-16">
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: "var(--gradient-halo)" }} />
      <div className="surface-panel relative w-full max-w-md rounded-3xl p-8 md:p-10">
        <Logo size={46} />
        <h1 className="mt-8 font-display text-2xl font-semibold">Set a new password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Open this page from the secure link we emailed you, then choose a new password.
        </p>

        <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
          <div>
            <Label htmlFor="password">New password</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" className="mt-2" />
            {errors["password"] && <p className="mt-1.5 text-xs text-destructive">{errors["password"]}</p>}
          </div>
          <div>
            <Label htmlFor="confirm">Confirm password</Label>
            <Input id="confirm" name="confirm" type="password" autoComplete="new-password" className="mt-2" />
            {errors["confirm"] && <p className="mt-1.5 text-xs text-destructive">{errors["confirm"]}</p>}
          </div>
          <Button type="submit" disabled={busy} className="w-full rounded-full">
            {busy ? "Updating…" : "Update password"}
          </Button>
        </form>

        <Link to="/auth" className="mt-6 inline-block text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
}