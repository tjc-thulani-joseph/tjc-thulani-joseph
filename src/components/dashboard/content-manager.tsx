import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { services } from "@/services";
import type { ContentSchema, FieldDef } from "@/config/content-schemas";
import { getMediaRef, mediaUrl, safeExternalUrl, type MediaRef } from "@/lib/media";
import { MediaField } from "@/components/dashboard/media-field";
import type { ContentRecord } from "@/types";

type Draft = Record<string, unknown>;
type Errors = Record<string, string>;

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item";
}

function emptyDraft(schema: ContentSchema): Draft {
  return Object.fromEntries(schema.fields.map((field) => [field.key, field.kind === "boolean" ? false : field.kind === "media" ? null : ""]));
}

function draftFromRecord(schema: ContentSchema, record: ContentRecord): Draft {
  const metadata = record.metadata ?? {};
  return Object.fromEntries(schema.fields.map((field) => {
    const raw = field.meta ? metadata[field.key] : (record as unknown as Record<string, unknown>)[field.key];
    return [field.key, field.kind === "media" ? getMediaRef(metadata, field.key) : field.kind === "boolean" ? Boolean(raw) : raw ?? ""];
  }));
}

function validate(schema: ContentSchema, draft: Draft): Errors {
  const errors: Errors = {};
  for (const field of schema.fields) {
    const value = draft[field.key];
    const text = typeof value === "string" ? value.trim() : "";
    if (field.required) {
      const validMedia = field.kind === "media" && Boolean(getMediaRef({ [field.key]: value }, field.key));
      const externalKey = `${field.key}_url`;
      const external = safeExternalUrl(draft[externalKey]);
      if (!text && !validMedia && !external && field.kind !== "boolean") errors[field.key] = `${field.label} is required.`;
    }
    if (field.kind === "url" && text && !safeExternalUrl(text)) errors[field.key] = "Enter a valid http:// or https:// URL.";
  }
  for (const field of schema.fields.filter((item) => item.kind === "media" && item.required)) {
    const ref = getMediaRef((draft as Record<string, unknown>), field.key);
    const external = safeExternalUrl(draft[`${field.key}_url`]);
    if (!ref && !external) errors[field.key] = `${field.label} requires an upload or a valid external URL.`;
  }
  return errors;
}

function toPayload(schema: ContentSchema, draft: Draft, base?: ContentRecord): Partial<ContentRecord> {
  const metadata: Record<string, unknown> = { ...(base?.metadata ?? {}) };
  const row: Record<string, unknown> = {};
  for (const field of schema.fields) {
    const value = draft[field.key];
    if (field.kind === "media") {
      const ref = value as MediaRef | null;
      metadata[field.key] = ref;
      if (field.mirrorTo) row[field.mirrorTo] = mediaUrl(ref);
    } else if (field.kind === "url") {
      metadata[field.key] = safeExternalUrl(value);
    } else if (field.meta) metadata[field.key] = value === "" ? null : value;
    else row[field.key] = value === "" ? null : value;
  }
  row["metadata"] = metadata;
  const title = String(draft["title"] ?? "").trim();
  if (!base?.slug) row["slug"] = `${slugify(title)}-${Date.now().toString(36)}`;
  return row as Partial<ContentRecord>;
}

export function ContentManager({ schema, description }: { schema: ContentSchema; description: string }) {
  const queryClient = useQueryClient();
  const repo = useMemo(() => services().repository<ContentRecord>(schema.resource), [schema.resource]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ record: ContentRecord | null; draft: Draft } | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [deleting, setDeleting] = useState<ContentRecord | null>(null);
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["content", schema.resource] });
    void queryClient.invalidateQueries({ queryKey: ["public", schema.resource] });
  };
  const list = useQuery({ queryKey: ["content", schema.resource], queryFn: () => repo.list({ perPage: 60, orderBy: "updated_at" }) });
  const save = useMutation({
    mutationFn: async ({ draft, record, publish }: { draft: Draft; record: ContentRecord | null; publish: boolean }) => {
      const nextErrors = validate(schema, draft);
      if (Object.keys(nextErrors).length) { setErrors(nextErrors); throw new Error(Object.values(nextErrors).join(" ")); }
      const payload = toPayload(schema, draft, record ?? undefined) as Record<string, unknown>;
      payload["status"] = publish ? "published" : "draft";
      payload["published_at"] = publish ? new Date().toISOString() : null;
      const result = record ? await repo.update(record.id, payload as Partial<ContentRecord>) : await repo.create(payload as Partial<ContentRecord>);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: (_data, variables) => { toast.success(variables.publish ? `${schema.singular} published` : `${schema.singular} saved as draft`); setEditing(null); setErrors({}); invalidate(); },
    onError: (error: Error) => toast.error("Could not save", { description: error.message }),
  });
  const togglePublish = useMutation({
    mutationFn: async (record: ContentRecord) => {
      const publishing = record.status !== "published";
      const result = await repo.update(record.id, { status: publishing ? "published" : "draft", published_at: publishing ? new Date().toISOString() : null } as Partial<ContentRecord>);
      if (result.error) throw new Error(result.error.message);
      return publishing;
    },
    onSuccess: (publishing) => { toast.success(publishing ? "Live on the public site" : "Removed from the public site"); invalidate(); },
    onError: (error: Error) => toast.error("Could not update", { description: error.message }),
  });
  const destroy = useMutation({
    mutationFn: async (record: ContentRecord) => { const result = await repo.softDelete(record.id); if (result.error) throw new Error(result.error.message); },
    onSuccess: () => { toast.success(`${schema.singular} deleted`); invalidate(); },
    onError: (error: Error) => toast.error("Could not delete", { description: error.message }),
  });
  const items = (list.data?.data?.items ?? []).filter((item) => { const term = search.trim().toLowerCase(); return !term || `${item.title ?? ""} ${item.category ?? ""}`.toLowerCase().includes(term); });
  const setField = (key: string, value: unknown) => { setErrors((current) => { const next = { ...current }; delete next[key]; return next; }); setEditing((prev) => prev ? { ...prev, draft: { ...prev.draft, [key]: value } } : prev); };
  const renderField = (field: FieldDef, draft: Draft) => {
    if (field.kind === "media") return <MediaField key={field.key} label={field.label} bucket={field.bucket ?? "images"} {...(field.accept ? { accept: field.accept } : {})} value={(draft[field.key] as MediaRef | null) ?? null} onChange={(ref) => setField(field.key, ref)} />;
    if (field.kind === "boolean") return <label key={field.key} className="flex items-center gap-3 text-sm"><Checkbox checked={Boolean(draft[field.key])} onCheckedChange={(checked) => setField(field.key, checked === true)} />{field.label}</label>;
    const error = errors[field.key];
    return <div key={field.key} className="space-y-2"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{field.label}</p>{field.kind === "textarea" ? <Textarea rows={4} value={String(draft[field.key] ?? "")} {...(field.placeholder ? { placeholder: field.placeholder } : {})} aria-invalid={Boolean(error)} onChange={(event) => setField(field.key, event.target.value)} /> : <Input type={field.kind === "date" ? "date" : field.kind === "url" ? "url" : "text"} value={String(draft[field.key] ?? "")} {...(field.placeholder ? { placeholder: field.placeholder } : {})} aria-invalid={Boolean(error)} onChange={(event) => setField(field.key, event.target.value)} />}{error && <p className="text-xs text-destructive">{error}</p>}</div>;
  };
  return <div className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.28em] text-gold">Content</p><h1 className="mt-3 font-display text-3xl font-semibold">{schema.label}</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p></div><Button className="rounded-full" onClick={() => { setErrors({}); setEditing({ record: null, draft: emptyDraft(schema) }); }}><Plus className="size-4" aria-hidden /> New {schema.singular.toLowerCase()}</Button></div>
    <div className="relative mt-8 max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${schema.label.toLowerCase()}`} className="pl-9" /></div>
    {list.isPending ? <div className="mt-6 space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div> : list.data?.error ? <p className="mt-6 text-sm text-muted-foreground">{list.data.error.message}</p> : items.length === 0 ? <p className="mt-6 text-sm text-muted-foreground">Nothing here yet. Create a {schema.singular.toLowerCase()} and publish it to see it on the public site.</p> : <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => { const metadata = item.metadata ?? {}; const preview = mediaUrl(getMediaRef(metadata, schema.previewField)) ?? item.thumbnail_url; const published = item.status === "published"; return <Card key={item.id} className="overflow-hidden border-border"><CardContent className="space-y-3 p-5">{preview && <img src={preview} alt="" className="aspect-video w-full rounded-lg object-cover" />}<div className="flex items-start justify-between gap-3"><h2 className="font-display text-base font-semibold">{item.title ?? "Untitled"}</h2><span className="text-[10px] uppercase tracking-[0.18em] text-gold/80">{item.status}</span></div>{item.category && <p className="text-xs text-muted-foreground">{item.category}</p>}<div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => { setErrors({}); setEditing({ record: item, draft: draftFromRecord(schema, item) }); }}><Pencil className="size-4" aria-hidden /> Edit</Button><Button size="sm" variant="ghost" disabled={togglePublish.isPending} onClick={() => togglePublish.mutate(item)}>{published ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}{published ? "Unpublish" : "Publish"}</Button><Button size="sm" variant="ghost" onClick={() => setDeleting(item)}><Trash2 className="size-4" aria-hidden /> Delete</Button></div></CardContent></Card>; })}</div>}
    <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}><DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>{editing?.record ? `Edit ${schema.singular.toLowerCase()}` : `New ${schema.singular.toLowerCase()}`}</DialogTitle></DialogHeader>{editing && <div className="space-y-5 py-2">{schema.fields.map((field) => renderField(field, editing.draft))}</div>}<DialogFooter><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button variant="outline" disabled={save.isPending} onClick={() => editing && save.mutate({ draft: editing.draft, record: editing.record, publish: false })}>Save draft</Button><Button disabled={save.isPending} onClick={() => editing && save.mutate({ draft: editing.draft, record: editing.record, publish: true })}>Publish</Button></DialogFooter></DialogContent></Dialog>
    <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {deleting?.title ?? "this record"}?</AlertDialogTitle><AlertDialogDescription>It is removed from the public site immediately. The stored file stays in your Media Library.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (deleting) destroy.mutate(deleting); setDeleting(null); }}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
