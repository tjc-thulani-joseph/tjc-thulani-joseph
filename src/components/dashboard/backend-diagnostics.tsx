import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleAlert, CircleDashed } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getSupabaseConnectionLabel } from "@/lib/supabase-status";
import { runBackendDiagnostics, type DiagnosticCheck } from "@/services/diagnostics";

function StatusIcon({ state }: { state: DiagnosticCheck["state"] }) {
  if (state === "pass") return <CheckCircle2 className="size-4 text-emerald-500" aria-hidden />;
  if (state === "blocked") return <CircleAlert className="size-4 text-destructive" aria-hidden />;
  return <CircleDashed className="size-4 text-muted-foreground" aria-hidden />;
}

export function BackendDiagnostics() {
  const query = useQuery({
    queryKey: ["backend-diagnostics"],
    queryFn: runBackendDiagnostics,
    staleTime: 30_000,
  });

  return (
    <Card className="mt-8 surface-panel border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Backend diagnostics</CardTitle>
      </CardHeader>
      <CardContent>
        {query.isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : query.error ? (
          <p className="text-sm text-destructive">Diagnostics could not run. Refresh and try again.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3 text-sm">
              <span>Supabase configuration</span>
              <span className="text-gold">{getSupabaseConnectionLabel()}</span>
            </div>

            {query.data?.checks.map((check) => (
              <div key={check.key} className="flex items-start gap-3 text-sm">
                <StatusIcon state={check.state} />
                <div>
                  <p>{check.label}</p>
                  <p className="text-xs text-muted-foreground">{check.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
