import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, ClipboardList } from "lucide-react";
import { services } from "@/services";
import type { ActivityEntry } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function actorLabel(entry: ActivityEntry) {
  return entry.actor_id ?? "System";
}

function metadataEntries(metadata: Record<string, unknown>) {
  return Object.entries(metadata);
}

function metadataValue(value: unknown) {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "—";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function ActivityLogsManager() {
  const [selected, setSelected] = useState<ActivityEntry | null>(null);
  const list = useQuery({
    queryKey: ["activity-logs"],
    queryFn: () => services().activity.list(100),
  });

  const items = list.data?.data ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-gold">System</p>
          <h1 className="mt-3 font-display text-3xl font-semibold">Activity Logs</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Audit trail of administrative and system activity in TJC OS.
          </p>
        </div>
        <Badge variant="outline" className="border-border text-muted-foreground">
          <ClipboardList className="mr-2 size-3.5 text-gold" aria-hidden /> {items.length} events
        </Badge>
      </div>

      {list.isPending ? (
        <div className="mt-8 space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : list.data?.error ? (
        <Card className="mt-8 surface-panel border-border">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">{list.data.error.message}</p>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card className="mt-8 surface-panel border-border">
          <CardContent className="p-10 text-center">
            <Activity className="mx-auto size-8 text-gold" aria-hidden />
            <h2 className="mt-4 font-display text-lg font-semibold">No activity recorded yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">System and administrative events will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-8 surface-panel border-border">
          <CardHeader>
            <CardTitle className="text-base font-medium">Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="divide-y divide-border">
              {items.map((entry) => (
                <li key={entry.id} className="py-4 first:pt-0 last:pb-0">
                  <button type="button" className="w-full text-left" onClick={() => setSelected(entry)}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{entry.action}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {actorLabel(entry)} · {entry.resource || "System"}
                          {entry.resource_id ? ` · ${entry.resource_id}` : ""}
                        </p>
                      </div>
                      <time className="shrink-0 text-xs text-muted-foreground" dateTime={entry.created_at}>
                        {formatDate(entry.created_at)}
                      </time>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {entry.resource && (
                        <Badge variant="outline" className="border-border text-muted-foreground">
                          {entry.resource}
                        </Badge>
                      )}
                      <span className="text-xs text-gold">View metadata</span>
                    </div>
                  </button>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Activity details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-5">
              <div className="grid gap-3 rounded-xl border border-border p-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Actor</p>
                  <p className="mt-1 break-all">{actorLabel(selected)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Action</p>
                  <p className="mt-1">{selected.action}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Resource</p>
                  <p className="mt-1">{selected.resource || "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Resource ID</p>
                  <p className="mt-1 break-all">{selected.resource_id || "—"}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Timestamp</p>
                  <p className="mt-1">{formatDate(selected.created_at)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Metadata</p>
                {metadataEntries(selected.metadata).length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No metadata attached.</p>
                ) : (
                  <dl className="mt-2 divide-y divide-border rounded-xl border border-border">
                    {metadataEntries(selected.metadata).map(([key, value]) => (
                      <div key={key} className="grid gap-1 p-3 sm:grid-cols-[minmax(8rem,0.35fr)_1fr] sm:gap-4">
                        <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{key}</dt>
                        <dd className="whitespace-pre-wrap break-words text-sm">{metadataValue(value)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
