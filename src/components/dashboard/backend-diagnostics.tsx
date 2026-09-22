import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ChevronRight, CircleAlert, CircleDashed } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { getSupabaseConnectionLabel } from "@/lib/supabase-status";
import { runBackendDiagnostics, type DiagnosticCheck } from "@/services/diagnostics";

function StatusIcon({ state }: { state: DiagnosticCheck["state"] }) {
  if (state === "pass") return <CheckCircle2 className="size-4 text-emerald-500" aria-hidden />;
  if (state === "blocked") return <CircleAlert className="size-4 text-destructive" aria-hidden />;
  return <CircleDashed className="size-4 text-muted-foreground" aria-hidden />;
}

function DiagnosticDetails({
  checks,
  loading,
  error,
}: {
  checks?: DiagnosticCheck[];
  loading: boolean;
  error: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">Diagnostics could not run. Refresh and try again.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-border pb-3 text-sm">
        <span>Supabase configuration</span>
        <span className="text-gold">{getSupabaseConnectionLabel()}</span>
      </div>
      {checks?.map((check) => (
        <div key={check.key} className="flex items-start gap-3 text-sm">
          <StatusIcon state={check.state} />
          <div>
            <p>{check.label}</p>
            <p className="text-xs text-muted-foreground">{check.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function BackendDiagnostics() {
  const query = useQuery({
    queryKey: ["backend-diagnostics"],
    queryFn: runBackendDiagnostics,
    staleTime: 30_000,
  });

  const summaryState = query.isPending ? "Checking" : query.error ? "Unavailable" : "View status";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="mt-8 flex w-full items-center justify-between rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:border-gold/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
          aria-label="Open backend diagnostics"
        >
          <span>
            <span className="block font-display text-base font-semibold">Backend Diagnostics</span>
            <span className="mt-1 block text-sm text-muted-foreground">System health &amp; connection status</span>
          </span>
          <span className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {summaryState}
            <ChevronRight className="size-4 text-gold" aria-hidden />
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display">Backend Diagnostics</DialogTitle>
          <DialogDescription>Read-only status checks for the TJC OS backend foundation.</DialogDescription>
        </DialogHeader>
        <Card className="surface-panel border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">System health &amp; connection status</CardTitle>
          </CardHeader>
          <CardContent>
            <DiagnosticDetails checks={query.data?.checks ?? []} loading={query.isPending} error={Boolean(query.error)} />
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
