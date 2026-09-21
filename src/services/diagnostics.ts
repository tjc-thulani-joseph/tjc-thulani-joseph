import { authService, services } from "@/services";
import { getSupabaseConfigurationState, type SupabaseConfigurationState } from "@/lib/supabase-status";

export type DiagnosticState = "pass" | "blocked" | "not_checked";

export interface DiagnosticCheck {
  key: string;
  label: string;
  state: DiagnosticState;
  detail: string;
}

export interface BackendDiagnostics {
  configuration: SupabaseConfigurationState;
  checks: DiagnosticCheck[];
}

/**
 * Runs safe diagnostic checks through the existing service contracts.
 * No credentials, payloads, or destructive mutations are used.
 */
export async function runBackendDiagnostics(): Promise<BackendDiagnostics> {
  const configuration = getSupabaseConfigurationState();
  const checks: DiagnosticCheck[] = [
    {
      key: "supabase-config",
      label: "Supabase configuration",
      state: configuration === "configured" ? "pass" : "blocked",
      detail:
        configuration === "configured"
          ? "Client initialized from environment variables."
          : "Missing VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY.",
    },
  ];

  if (configuration === "not_configured") {
    checks.push(
      { key: "auth", label: "Authentication state", state: "not_checked", detail: "Not checked because Supabase is not configured." },
      { key: "role", label: "Role resolution", state: "not_checked", detail: "Not checked because Supabase is not configured." },
      { key: "safe-read", label: "Safe repository read", state: "not_checked", detail: "Not checked because Supabase is not configured." },
      { key: "activity-read", label: "Activity-log read access", state: "not_checked", detail: "Not checked because Supabase is not configured." },
      { key: "activity-write", label: "Activity-log write path", state: "not_checked", detail: "Not verified — no diagnostic write was performed." },
    );
    return { configuration, checks };
  }

  const session = await authService.getSession();
  if (!session) {
    checks.push(
      { key: "auth", label: "Authentication state", state: "blocked", detail: "No authenticated session is available." },
      { key: "role", label: "Role resolution", state: "not_checked", detail: "Not checked because no authenticated session is available." },
      { key: "safe-read", label: "Safe repository read", state: "not_checked", detail: "Not checked because no authenticated session is available." },
      { key: "activity-read", label: "Activity-log read access", state: "not_checked", detail: "Not checked because no authenticated session is available." },
      { key: "activity-write", label: "Activity-log write path", state: "not_checked", detail: "Not verified — no diagnostic write was performed." },
    );
    return { configuration, checks };
  }

  checks.push({
    key: "auth",
    label: "Authentication state",
    state: "pass",
    detail: `Authenticated session resolved for ${session.user.email || "current user"}.`,
  });

  const roles = session.user.roles ?? [];
  checks.push({
    key: "role",
    label: "Role resolution",
    state: roles.length ? "pass" : "blocked",
    detail: roles.length
      ? `Resolved roles: ${roles.join(", ")}.`
      : "No roles were resolved for the authenticated user.",
  });

  const safeRead = await services().repository("posts").list({ perPage: 1 });
  checks.push(
    safeRead.error
      ? {
          key: "safe-read",
          label: "Safe repository read",
          state: "blocked",
          detail: safeRead.error.message,
        }
      : {
          key: "safe-read",
          label: "Safe repository read",
          state: "pass",
          detail: "A non-destructive repository read completed successfully.",
        },
  );

  const activityRead = await services().activity.list(1);
  checks.push(
    activityRead.error
      ? {
          key: "activity-read",
          label: "Activity-log read access",
          state: "blocked",
          detail: activityRead.error.message,
        }
      : {
          key: "activity-read",
          label: "Activity-log read access",
          state: "pass",
          detail: "Activity-log read access is reachable through the existing service layer.",
        },
  );

  checks.push({
    key: "activity-write",
    label: "Activity-log write path",
    state: "not_checked",
    detail: "Not verified — no diagnostic write was performed.",
  });

  return { configuration, checks };
}
