import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { services } from "@/services";
import type { ContentSchema, FieldDef } from "@/config/content-schemas";
import { getMediaRef, mediaUrl, type MediaRef } from "@/lib/media";
import { MediaField } from "@/components/dashboard/media-field";
import type { ContentRecord } from "@/types";

type Draft = Record<string, unknown>;

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item"
  );
}

function emptyDraft(schema: ContentSchema): Draft {
  const draft: Draft = {};
  for (const field of schema.fields) {
    draft[field.key] = field.kind === "boolean" ? false : field.kind === "media" ? null : "";
  }
  return draft;
}

function draftFromRecord(schema: ContentSchema, record: ContentRecord): Draft {
  const metadata = (record.metadata ?? {}) as Record<string, unknown>;
  const draft: Draft = {};
  for (const field of schema.fields) {
    const raw = field.meta ? metadata[field.key] : (record as unknown as Record<string, unknown>)[field.key];
    if (field.kind === "media") draft[field.key] = getMediaRef(metadata, field.key);
    else if (field.kind === "boolean") draft[field.key] = Boolean(raw);
    else draft[field.key] = (raw as string | null) ?? "";
  }
  return draft;
}

function applyPublicationState(payload: Record<string, unknown>, record: ContentRecord | null, publish?: boolean) {
  if (publish === true) {
    payload["status"] = "published";
    payload["published_at"] = new Date().toISOString();
    return;
  }

  if (publish === false) {
    payload["status"] = "draft";
    payload["published_at"] = null;
    return;
  }

  if (!record) {
    payload["status"] = "draft";
    payload["published_at"] = null;
  }
}

/** Turns the editor draft into the row shape of the existing content table. */
function toPayload(schema: ContentSchema, draft: Draft, base?: ContentRecord): Partial<ContentRecord> {
  const metadata: Record<string, unknown> = { ...((base?.metadata ?? {}) as Record<string, unknown>) };
  const row: Record<string, unknown> = {};

  for (const field of schema.fields) {
    const value = draft[field.key];
    if (field.kind === "media") {
      const ref = value as MediaRef | null;
      if (field.meta) metadata[field.key] = ref;
      if (field.mirrorTo) row[field.mirrorTo] = mediaUrl(ref);
      continue;
    }
    if (field.meta) metadata[field.key] = value === "" ? null : value;
    else row[field.key] = value === "" ? null : value;
  }

  row['metadata'] = metadata;
  const title = String(draft['title'] ?? "").trim();
  if (!base?.slug) row['slug'] = `${slugify(title)}-${Date.now().toString(36)}`;
  return row as Partial<ContentRecord>;
}

export function ContentManager({ schema, description }: { schema: ContentSchema; description: string }) {
  const queryClient = useQueryClient();
  const repo = useMemo(() => services().repository<ContentRecord>(schema.resource), [schema.resource]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ record: ContentRecord | null; draft: Draft } | null>(null);
  const [deleting, setDeleting] = useState<ContentRecord | null>(null);

  const list = useQuery({
    queryKey: ["content", schema.resource],
    queryFn: () => repo.list({ perPage: 60, orderBy: "updated_at" }),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["content", schema.resource] });
    void queryClient.invalidateQueries({ queryKey: ["public", schema.resource] });
  };

  const save = useMutation({
    mutationFn: async ({ draft, record, publish }: { draft: Draft; record: ContentRecord | null; publish?: boolean }) => {
      const payload = toPayload(schema, draft, record ?? undefined) as Record<string, unknown>;
      applyPublicationState(payload, record, publish);
      const result = record
        ? await repo.update(record.id, payload as Partial<ContentRecord>)
        : await repo.create(payload as Partial<ContentRecord>);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: (_data, variables) => {
      toast.success(
        variables.publish === true
          ? `${schema.singular} published`
          : variables.publish === false
            ? `${schema.singular} saved as draft`
            : variables.record
              ? `${schema.singular} saved`
              : `${schema.singular} created`,
      );
      setEditing(null);
      invalidate();
    },
    onError: (error: Error) => toast.error("Could not save", { description: error.message }),
  });

  const togglePublish = useMutation({
    mutationFn: async (record: ContentRecord) => {
      const publishing = record.status !== "published";
      const result = await repo.update(record.id, {
        status: publishing ? "published" : "draft",
        published_at: publishing ? new Date().toISOString() : null,
      } as Partial<ContentRecord>);
      if (result.error) throw new Error(result.error.message);
      return publishing;
    },
    onSuccess: (publishing) => {
      toast.success(publishing ? "Live on the public site" : "Removed from the public site");
      invalidate();
    },
    onError: (error: Error) => toast.error("Could not update", { description: error.message }),
  });

  const destroy = useMutation({
    mutationFn: async (record: ContentRecord) => {
      const result = await repo.softDelete(record.id);
      if (result.error) throw new Error(result.error.message);
    },
    onSuccess: () => {
      toast.success(`${schema.singular} deleted`);
      invalidate();
    },
    onError: (error: Error) => toast.error("Could not delete", { description: error.message }),
  });

  const items = (list.data?.data?.items ?? []).filter((item) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return `${item.title ?? ""} ${item.category ?? ""}`.toLowerCase().includes(term);
  });

  function setField(key: string, value: unknown) {
    setEditing((prev) => (prev ? { ...prev, draft: { ...prev.draft, [key]: value } } : prev));
  }

  function renderField(field: FieldDef, draft: Draft) {
    if (field.kind === "media") {
      return (
        <MediaField
          key={field.key}
          label={field.label}
          bucket={field.bucket ?? "images"}
          {...(field.accept ? { accept: field.accept } : {})}
          value={(draft[field.key] as MediaRef | null) ?? null}
          onChange={(ref) => setField(field.key, ref)}
        />
      );
    }
    if (field.kind === "boolean") {
      return (
        <label key={field.key} className="flex items-center gap-3 text-sm">
          <Checkbox
            checked={Boolean(draft[field.key])}
            onCheckedChange={(checked) => setField(field.key, checked === true)}
          />
          {field.label}
        </label>
      );
    }
    return (
      <div key={field.key} className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{field.label}</p>
        {field.kind === "textarea" ? (
          <Textarea
            rows={4}
            value={String(draft[field.key] ?? "")}
            {...(field.placeholder ? { placeholder: field.placeholder } : {})}
            onChange={(event) => setField(field.key, event.target.value)}
          />
        ) : (
          <Input
            type={field.kind === "date" ? "date" : "text"}
            value={String(draft[field.key] ?? "")}
            {...(field.placeholder ? { placeholder: field.placeholder } : {})}
            onChange={(event) => setField(field.key, event.target.value)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-gold">Content</p>
          <h1 className="mt-3 font-display text-3xl font-semibold">{schema.label}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
        <Button
          className="rounded-full"
          onClick={() => setEditing({ record: null, draft: emptyDraft(schema) })}
        >
          <Plus className="size-4" aria-hidden /> New {schema.singular.toLowerCase()}
        </Button>
      </div>

      <div className="relative mt-8 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={`Search ${schema.label.toLowerCase()}`}
          className="pl-9"
        />
      </div>

      {list.isPending ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : list.data?.error ? (
        <p className="mt-6 text-sm text-muted-foreground">{list.data.error.message}</p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Nothing here yet. Create a {schema.singular.toLowerCase()} and publish it to see it on the public site.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const metadata = (item.metadata ?? {}) as Record<string, unknown>;
            const preview = mediaUrl(getMediaRef(metadata, schema.previewField)) ?? item.thumbnail_url;
            const published = item.status === "published";
            return (
              <Card key={item.id} className="surface-panel overflow-hidden border-border">
                {preview && <img src={preview} alt="" className="aspect-video w-full object-cover" />}
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-display text-base font-semibold">{item.title ?? "Untitled"}</h2>
                    <span className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-gold/80">
                      {item.status}
                    </span>
                  </div>
                  {item.category && <p className="text-xs text-muted-foreground">{item.category}</p>}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="hairline-gold bg-transparent"
                      onClick={() => setEditing({ record: item, draft: draftFromRecord(schema, item) })}
                    >
                      <Pencil className="size-4" aria-hidden /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={togglePublish.isPending}
                      onClick={() => togglePublish.mutate(item)}
                    >
                      {published ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                      {published ? "Unpublish" : "Publish"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleting(item)}>
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing?.record ? `Edit ${schema.singular.toLowerCase()}` : `New ${schema.singular.toLowerCase()}`}
            </DialogTitle>
          </DialogHeader>
          {editing && <div className="space-y-5 py-2">{schema.fields.map((field) => renderField(field, editing.draft))}</div>}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              className="hairline-gold bg-transparent"
              disabled={save.isPending}
              onClick={() => editing && save.mutate({ draft: editing.draft, record: editing.record, publish: false })}
            >
              Save draft
            </Button>
            <Button
              disabled={save.isPending}
              onClick={() => editing && save.mutate({ draft: editing.draft, record: editing.record, publish: true })}
            >
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.title ?? "this record"}?</AlertDialogTitle>
            <AlertDialogDescription>
              It is removed from the public site immediately. The stored file stays in your Media Library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleting) destroy.mutate(deleting);
                setDeleting(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
