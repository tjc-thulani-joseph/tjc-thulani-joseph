import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Mail, MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { services } from "@/services";
import type { ContentStatus, ContentRecord } from "@/types";

interface MessageRecord extends ContentRecord {
  name: string | null;
  email: string | null;
  body: string;
  channel: string | null;
}

const STATUSES: ContentStatus[] = ["draft", "scheduled", "published", "archived"];

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function preview(value: string, length = 140) {
  const text = value.trim();
  return text.length > length ? `${text.slice(0, length).trimEnd()}…` : text;
}

export function MessagesManager() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<MessageRecord | null>(null);
  const [deleting, setDeleting] = useState<MessageRecord | null>(null);
  const repo = useMemo(() => services().repository<MessageRecord>("messages"), []);

  const list = useQuery({
    queryKey: ["messages"],
    queryFn: () => repo.list({ perPage: 60, orderBy: "created_at" }),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["messages"] });
  };

  const updateStatus = useMutation({
    mutationFn: async ({ record, status }: { record: MessageRecord; status: ContentStatus }) => {
      const result = await repo.update(record.id, { status } as Partial<MessageRecord>);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: (record) => {
      toast.success("Message status updated");
      setSelected((current) => current?.id === record.id ? { ...current, status: record.status, updated_at: record.updated_at } : current);
      invalidate();
    },
    onError: (error: Error) => toast.error("Could not update message", { description: error.message }),
  });

  const archive = useMutation({
    mutationFn: async (record: MessageRecord) => {
      const result = await repo.softDelete(record.id);
      if (result.error) throw new Error(result.error.message);
    },
    onSuccess: () => {
      toast.success("Message archived");
      setDeleting(null);
      setSelected(null);
      invalidate();
    },
    onError: (error: Error) => toast.error("Could not archive message", { description: error.message }),
  });

  const items = list.data?.data?.items ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-gold">Audience</p>
          <h1 className="mt-3 font-display text-3xl font-semibold">Messages</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Direct messages from the contact channels.</p>
        </div>
        <Badge variant="outline" className="border-border text-muted-foreground">
          <MessageSquare className="mr-2 size-3.5 text-gold" aria-hidden /> {list.data?.data?.total ?? 0} messages
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
          <CardContent className="p-6"><p className="text-sm text-muted-foreground">{list.data.error.message}</p></CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card className="mt-8 surface-panel border-border">
          <CardContent className="p-10 text-center">
            <Mail className="mx-auto size-8 text-gold" aria-hidden />
            <h2 className="mt-4 font-display text-lg font-semibold">No messages yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">Messages submitted through the connected contact channels will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-8 surface-panel border-border">
          <CardHeader><CardTitle className="text-base font-medium">Inbox</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {items.map((message) => (
                <li key={message.id} className="flex flex-wrap items-start gap-4 py-4 first:pt-0 last:pb-0">
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setSelected(message)}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{message.name || "Unknown sender"}</span>
                      <span className="text-xs text-muted-foreground">{message.email || "No email"}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{preview(message.body)}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {message.channel || "Contact"} · Received {formatDate(message.created_at)} · Updated {formatDate(message.updated_at)}
                    </p>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline" className="border-border capitalize text-muted-foreground">{message.status}</Badge>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setSelected(message)}>Open</Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="font-display">Message from {selected?.name || "Unknown sender"}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-5">
              <div className="grid gap-3 rounded-xl border border-border p-4 text-sm sm:grid-cols-2">
                <div><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Email</p><p className="mt-1 break-all">{selected.email || "—"}</p></div>
                <div><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Channel</p><p className="mt-1">{selected.channel || "—"}</p></div>
                <div><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Created</p><p className="mt-1">{formatDate(selected.created_at)}</p></div>
                <div><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Updated</p><p className="mt-1">{formatDate(selected.updated_at)}</p></div>
              </div>
              <div><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Message</p><p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{selected.body}</p></div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Status</p>
                <Select value={selected.status} onValueChange={(status) => updateStatus.mutate({ record: selected, status: status as ContentStatus })} disabled={updateStatus.isPending}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((status) => <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <DialogFooter className="gap-2 sm:justify-between">
                <Button type="button" variant="outline" className="hairline-gold bg-transparent text-destructive" onClick={() => setDeleting(selected)}>
                  <Trash2 className="mr-2 size-4" aria-hidden /> Archive
                </Button>
                <Button type="button" variant="ghost" onClick={() => setSelected(null)}>Close</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this message?</AlertDialogTitle>
            <AlertDialogDescription>This message will be removed from the inbox while remaining recoverable through its soft-deleted record.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={archive.isPending} onClick={() => deleting && archive.mutate(deleting)}>
              <Archive className="mr-2 size-4" aria-hidden /> Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
