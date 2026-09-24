import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { isSupabaseConfigured } from "@/lib/supabase";
import { authService } from "@/services";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "TJC OS — Secure Sign In" },
      {
        name: "description",
        content: "Secure sign in to TJC OS, the private management system of Thulani Joseph.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "TJC OS — Secure Sign In" },
      { property: "og:description", content: "Private management system access." },
      { property: "og:url", content: "/auth" },
    ],
    links: [{ rel: "canonical", href: "/auth" }],
  }),
  component: AuthPage,
});

const credentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

const recoveryEmailSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
});

const recoveryCodeSchema = z.object({
  token: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit verification code"),
});

const passwordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type AuthMode = "signin" | "recovery-email" | "recovery-code" | "recovery-password";

function AuthPage() {
  const { signIn, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isAuthenticated && mode === "signin") {
      navigate({
        to: "/dashboard/$module",
        params: { module: "overview" },
        replace: true,
      });
    }
  }, [isAuthenticated, mode, navigate]);

  async function onSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = credentialsSchema.safeParse(
      Object.fromEntries(new FormData(event.currentTarget)),
    );

    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        next[String(issue.path[0])] = issue.message;
      }
      setErrors(next);
      return;
    }

    setErrors({});
    setBusy(true);

    const result = await authService.signIn(parsed.data);

    setBusy(false);

    if (result.error) {
      if (result.error.code === "auth_unreachable") {
        toast.error("Sign in unavailable", {
          description: result.error.message,
        });
        return;
      }

      toast.error("Incorrect email or password", {
        description: "Please check your credentials and try again.",
      });
    }
  }

  async function onRequestRecovery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = recoveryEmailSchema.safeParse(
      Object.fromEntries(new FormData(event.currentTarget)),
    );

    if (!parsed.success) {
      setErrors({
        email: parsed.error.issues[0]?.message ?? "Enter a valid email address",
      });
      return;
    }

    setErrors({});
    setBusy(true);

    const result = await authService.requestPasswordReset(parsed.data.email);

    setBusy(false);

    if (result.error) {
      toast.error("Recovery unavailable", {
        description: "Please try again in a moment.",
      });
      return;
    }

    setRecoveryEmail(parsed.data.email);
    setMode("recovery-code");

    toast.success("Verification code sent", {
      description: "Check your email for your TJC OS password recovery code.",
    });
  }

  async function onVerifyRecoveryCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = recoveryCodeSchema.safeParse(
      Object.fromEntries(new FormData(event.currentTarget)),
    );

    if (!parsed.success) {
      setErrors({
        token: parsed.error.issues[0]?.message ?? "Enter the 6-digit verification code",
      });
      return;
    }

    setErrors({});
    setBusy(true);

    const result = await authService.verifyPasswordRecoveryCode(
      recoveryEmail,
      parsed.data.token,
    );

    setBusy(false);

    if (result.error) {
      toast.error("Verification failed", {
        description: "That code is invalid or expired. Please request a new code.",
      });
      return;
    }

    setMode("recovery-password");

    toast.success("Identity verified", {
      description: "You can now create a new TJC OS password.",
    });
  }

  async function onUpdatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = passwordSchema.safeParse(
      Object.fromEntries(new FormData(event.currentTarget)),
    );

    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        next[String(issue.path[0])] = issue.message;
      }
      setErrors(next);
      return;
    }

    setErrors({});
    setBusy(true);

    const result = await authService.updatePassword(parsed.data.password);

    setBusy(false);

    if (result.error) {
      toast.error("Password not updated", {
        description: "Please try again.",
      });
      return;
    }

    toast.success("Password updated", {
      description: "Your TJC OS password has been changed successfully.",
    });

    setMode("signin");
    setRecoveryEmail("");
  }

  function goBackToSignIn() {
    setMode("signin");
    setErrors({});
    setRecoveryEmail("");
  }

  const heading =
    mode === "signin"
      ? "Enter TJC OS"
      : mode === "recovery-email"
        ? "Password Recovery"
        : mode === "recovery-code"
          ? "Verify Your Identity"
          : "Create New Password";

  const description =
    mode === "signin"
      ? "Private management system. Authorised access only."
      : mode === "recovery-email"
        ? "Enter your account email and we'll send a secure verification code."
        : mode === "recovery-code"
          ? `We've sent a verification code to ${recoveryEmail}.`
          : "Your identity has been verified. Choose a new password for TJC OS.";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: "var(--gradient-halo)" }}
      />

      <div className="surface-panel relative w-full max-w-md rounded-3xl p-8 md:p-10">
        <Logo size={46} />

        <h1 className="mt-8 font-display text-2xl font-semibold">
          {heading}
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          {description}
        </p>

        {mode === "signin" && (
          <form onSubmit={onSignIn} noValidate className="mt-8 space-y-5">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                className="mt-2"
              />
              {errors["email"] && (
                <p className="mt-1.5 text-xs text-destructive">
                  {errors["email"]}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                className="mt-2"
              />
              {errors["password"] && (
                <p className="mt-1.5 text-xs text-destructive">
                  {errors["password"]}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={busy}
              className="w-full rounded-full"
            >
              {busy ? "Verifying…" : "Sign in securely"}
            </Button>

            <button
              type="button"
              onClick={() => {
                setMode("recovery-email");
                setErrors({});
              }}
              className="w-full text-xs text-muted-foreground hover:text-gold"
            >
              Forgot password?
            </button>
          </form>
        )}

        {mode === "recovery-email" && (
          <form
            onSubmit={onRequestRecovery}
            noValidate
            className="mt-8 space-y-5"
          >
            <div>
              <Label htmlFor="recovery-email">Email</Label>
              <Input
                id="recovery-email"
                name="email"
                type="email"
                autoComplete="email"
                className="mt-2"
                required
              />
              {errors["email"] && (
                <p className="mt-1.5 text-xs text-destructive">
                  {errors["email"]}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={busy}
              className="w-full rounded-full"
            >
              {busy ? "Sending…" : "Send verification code"}
            </Button>

            <button
              type="button"
              onClick={goBackToSignIn}
              className="w-full text-xs text-muted-foreground hover:text-gold"
            >
              Back to sign in
            </button>
          </form>
        )}

        {mode === "recovery-code" && (
          <form
            onSubmit={onVerifyRecoveryCode}
            noValidate
            className="mt-8 space-y-5"
          >
            <div>
              <Label htmlFor="recovery-token">Verification code</Label>
              <Input
                id="recovery-token"
                name="token"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                className="mt-2 text-center text-lg tracking-[0.35em]"
              />
              {errors["token"] && (
                <p className="mt-1.5 text-xs text-destructive">
                  {errors["token"]}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={busy}
              className="w-full rounded-full"
            >
              {busy ? "Verifying…" : "Verify code"}
            </Button>

            <button
              type="button"
              onClick={() => setMode("recovery-email")}
              className="w-full text-xs text-muted-foreground hover:text-gold"
            >
              Use a different email
            </button>
          </form>
        )}

        {mode === "recovery-password" && (
          <form
            onSubmit={onUpdatePassword}
            noValidate
            className="mt-8 space-y-5"
          >
            <div>
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                name="password"
                type="password"
                autoComplete="new-password"
                className="mt-2"
              />
              {errors["password"] && (
                <p className="mt-1.5 text-xs text-destructive">
                  {errors["password"]}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                name="confirm"
                type="password"
                autoComplete="new-password"
                className="mt-2"
              />
              {errors["confirm"] && (
                <p className="mt-1.5 text-xs text-destructive">
                  {errors["confirm"]}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={busy}
              className="w-full rounded-full"
            >
              {busy ? "Updating…" : "Update password"}
            </Button>
          </form>
        )}

        {!isSupabaseConfigured && (
          <p className="mt-8 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
            Add <code className="mx-1 text-gold">VITE_SUPABASE_URL</code> and
            <code className="mx-1 text-gold">VITE_SUPABASE_ANON_KEY</code> to
            the <code className="mx-1 text-gold">.env</code> file at the
            project root, then reload to activate sign in.
          </p>
        )}

        {mode === "signin" ? (
          <Link
            to="/"
            className="mt-8 inline-block text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
          >
            ← Back to site
          </Link>
        ) : (
          <button
            type="button"
            onClick={goBackToSignIn}
            className="mt-8 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
          >
            ← Back to sign in
          </button>
        )}
      </div>
    </div>
  );
}
