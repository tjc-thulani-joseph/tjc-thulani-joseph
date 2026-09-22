import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  Eye,
  EyeOff,
  Lock,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { services } from "@/services";
import type { ContentSchema, FieldDef } from "@/config/content-schemas";
import {
  getMediaRef,
  mediaUrl,
  safeExternalUrl,
  type MediaRef,
} from "@/lib/media";
import { MediaField } from "@/components/dashboard/media-field";
import type { ContentRecord, ContentStatus } from "@/types";

type Draft = Record<string, unknown>;
type Errors = Record<string, string>;

const CONTENT_STATUSES: Array<{
  value: ContentStatus;
  label: string;
  description: string;
}> = [
  {
    value: "draft",
    label: "Draft",
    description: "Saved privately while you continue working.",
  },
  {
    value: "private",
    label: "Private",
    description: "Saved in TJC OS but hidden from the public site.",
  },
  {
    value: "scheduled",
    label: "Scheduled",
    description: "Prepared for a future publishing time.",
  },
  {
    value: "published",
    label: "Published",
    description: "Eligible to appear on the public site.",
  },
  {
    value: "archived",
    label: "Archived",
    description: "Kept for records but hidden from the public site.",
  },
];

function statusLabel(status: ContentStatus) {
  return (
    CONTENT_STATUSES.find((item) => item.value === status)?.label ??
    status
  );
}

function statusDescription(status: ContentStatus) {
  return (
    CONTENT_STATUSES.find((item) => item.value === status)?.description ??
    ""
  );
}

function statusIcon(status: ContentStatus) {
  if (status === "published") return Eye;
  if (status === "private") return Lock;
  if (status === "scheduled") return Send;
  if (status === "archived") return Archive;
  return Pencil;
}

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
  return Object.fromEntries(
    schema.fields.map((field) => [
      field.key,
      field.kind === "boolean"
        ? false
        : field.kind === "media"
          ? null
          : "",
    ]),
  );
}

function draftFromRecord(
  schema: ContentSchema,
  record: ContentRecord,
): Draft {
  const metadata = record.metadata ?? {};

  return Object.fromEntries(
    schema.fields.map((field) => {
      const raw = field.meta
        ? metadata[field.key]
        : (record as unknown as Record<string, unknown>)[field.key];

      return [
        field.key,
        field.kind === "media"
          ? getMediaRef(metadata, field.key)
          : field.kind === "boolean"
            ? Boolean(raw)
            : raw ?? "",
      ];
    }),
  );
}

function validate(schema: ContentSchema, draft: Draft): Errors {
  const errors: Errors = {};

  for (const field of schema.fields) {
    const value = draft[field.key];
    const text = typeof value === "string" ? value.trim() : "";

    if (field.required) {
      const validMedia =
        field.kind === "media" &&
        Boolean(getMediaRef({ [field.key]: value }, field.key));

      const externalKey = `${field.key}_url`;
      const external = safeExternalUrl(draft[externalKey]);

      if (
        !text &&
        !validMedia &&
        !external &&
        field.kind !== "boolean"
      ) {
        errors[field.key] = `${field.label} is required.`;
      }
    }

    if (field.kind === "url" && text && !safeExternalUrl(text)) {
      errors[field.key] = "Enter a valid http:// or https:// URL.";
    }
  }

  for (const field of schema.fields.filter(
    (item) => item.kind === "media" && item.required,
  )) {
    const ref = getMediaRef(
      draft as Record<string, unknown>,
      field.key,
    );

    const external = safeExternalUrl(
      draft[`${field.key}_url`],
    );

    if (!ref && !external) {
      errors[field.key] =
        `${field.label} requires an upload or a valid external URL.`;
    }
  }

  return errors;
}

function toPayload(
  schema: ContentSchema,
  draft: Draft,
  base?: ContentRecord,
): Partial<ContentRecord> {
  const metadata: Record<string, unknown> = {
    ...(base?.metadata ?? {}),
  };

  const row: Record<string, unknown> = {};

  for (const field of schema.fields) {
    const value = draft[field.key];

    if (field.kind === "media") {
      const ref = value as MediaRef | null;
      metadata[field.key] = ref;

      if (field.mirrorTo) {
        row[field.mirrorTo] = mediaUrl(ref);
      }
    } else if (field.kind === "url") {
      metadata[field.key] = safeExternalUrl(value);
    } else if (field.meta) {
      metadata[field.key] = value === "" ? null : value;
    } else {
      row[field.key] = value === "" ? null : value;
    }
  }

  row["metadata"] = metadata;

  const title = String(draft["title"] ?? "").trim();

  if (!base?.slug) {
    row["slug"] = `${slugify(title)}-${Date.now().toString(36)}`;
  }

  return row as Partial<ContentRecord>;
}

function isoToDateTimeLocal(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (number: number) => String(number).padStart(2, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-") + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function dateTimeLocalToIso(value: string) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export function ContentManager({
  schema,
  description,
}: {
  schema: ContentSchema;
  description: string;
}) {
  const queryClient = useQueryClient();

  const repo = useMemo(
    () => services().repository<ContentRecord>(schema.resource),
    [schema.resource],
  );

  const [search, setSearch] = useState("");

  const [editing, setEditing] = useState<{
    record: ContentRecord | null;
    draft: Draft;
    status: ContentStatus;
    scheduledFor: string;
  } | null>(null);

  const [errors, setErrors] = useState<Errors>({});
  const [deleting, setDeleting] = useState<ContentRecord | null>(null);

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: ["content", schema.resource],
    });

    // The public homepage data layer uses ["home", resource, limit].
    // Invalidating the prefix refreshes every public query for this resource.
    void queryClient.invalidateQueries({
      queryKey: ["home", schema.resource],
    });
  };

  const list = useQuery({
    queryKey: ["content", schema.resource],
    queryFn: () =>
      repo.list({
        perPage: 60,
        orderBy: "updated_at",
      }),
  });

  const save = useMutation({
    mutationFn: async ({
      draft,
      record,
      status,
      scheduledFor,
    }: {
      draft: Draft;
      record: ContentRecord | null;
      status: ContentStatus;
      scheduledFor: string;
    }) => {
      const nextErrors = validate(schema, draft);

      if (Object.keys(nextErrors).length) {
        setErrors(nextErrors);
        throw new Error(Object.values(nextErrors).join(" "));
      }

      if (status === "scheduled" && !scheduledFor) {
        throw new Error(
          "Choose a future date and time for scheduled publishing.",
        );
      }

      const scheduledIso = dateTimeLocalToIso(scheduledFor);

      if (status === "scheduled") {
        if (!scheduledIso) {
          throw new Error(
            "The scheduled publishing date and time is invalid.",
          );
        }

        if (new Date(scheduledIso).getTime() <= Date.now()) {
          throw new Error(
            "Scheduled publishing must be set to a future date and time.",
          );
        }
      }

      const payload = toPayload(
        schema,
        draft,
        record ?? undefined,
      ) as Record<string, unknown>;

      payload["status"] = status;

      if (status === "published") {
        payload["published_at"] =
          record?.status === "published" && record.published_at
            ? record.published_at
            : new Date().toISOString();
      } else if (status === "scheduled") {
        payload["published_at"] = scheduledIso;
      } else {
        payload["published_at"] = null;
      }

      const result = record
        ? await repo.update(
            record.id,
            payload as Partial<ContentRecord>,
          )
        : await repo.create(
            payload as Partial<ContentRecord>,
          );

      if (result.error) {
        throw new Error(result.error.message);
      }

      return result.data;
    },

    onSuccess: (_data, variables) => {
      toast.success(
        `${schema.singular} ${statusLabel(variables.status).toLowerCase()}`,
        {
          description: statusDescription(variables.status),
        },
      );

      setEditing(null);
      setErrors({});
      invalidate();
    },

    onError: (error: Error) =>
      toast.error("Could not save", {
        description: error.message,
      }),
  });

  const quickPublish = useMutation({
    mutationFn: async (record: ContentRecord) => {
      const publishing = record.status !== "published";

      const result = await repo.update(
        record.id,
        {
          status: publishing ? "published" : "draft",
          published_at: publishing
            ? record.published_at ?? new Date().toISOString()
            : null,
        } as Partial<ContentRecord>,
      );

      if (result.error) {
        throw new Error(result.error.message);
      }

      return publishing;
    },

    onSuccess: (publishing) => {
      toast.success(
        publishing
          ? "Live on the public site"
          : "Removed from the public site",
      );

      invalidate();
    },

    onError: (error: Error) =>
      toast.error("Could not update", {
        description: error.message,
      }),
  });

  const destroy = useMutation({
    mutationFn: async (record: ContentRecord) => {
      const result = await repo.softDelete(record.id);

      if (result.error) {
        throw new Error(result.error.message);
      }
    },

    onSuccess: () => {
      toast.success(`${schema.singular} deleted`);
      invalidate();
    },

    onError: (error: Error) =>
      toast.error("Could not delete", {
        description: error.message,
      }),
  });

  const items = (list.data?.data?.items ?? []).filter((item) => {
    const term = search.trim().toLowerCase();

    return (
      !term ||
      `${item.title ?? ""} ${item.category ?? ""}`
        .toLowerCase()
        .includes(term)
    );
  });

  const setField = (key: string, value: unknown) => {
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });

    setEditing((prev) =>
      prev
        ? {
            ...prev,
            draft: {
              ...prev.draft,
              [key]: value,
            },
          }
        : prev,
    );
  };

  const setStatus = (status: ContentStatus) => {
    setErrors((current) => {
      const next = { ...current };
      delete next.status;
      return next;
    });

    setEditing((prev) =>
      prev
        ? {
            ...prev,
            status,
            scheduledFor:
              status === "scheduled"
                ? prev.scheduledFor
                : "",
          }
        : prev,
    );
  };

  const renderField = (
    field: FieldDef,
    draft: Draft,
  ) => {
    if (field.kind === "media") {
      return (
        <MediaField
          key={field.key}
          label={field.label}
          bucket={field.bucket ?? "images"}
          {...(field.accept
            ? { accept: field.accept }
            : {})}
          value={
            (draft[field.key] as MediaRef | null) ??
            null
          }
          onChange={(ref) =>
            setField(field.key, ref)
          }
        />
      );
    }

    if (field.kind === "boolean") {
      return (
        <label
          key={field.key}
          className="flex items-center gap-3 text-sm"
        >
          <Checkbox
            checked={Boolean(draft[field.key])}
            onCheckedChange={(checked) =>
              setField(
                field.key,
                checked === true,
              )
            }
          />
          {field.label}
        </label>
      );
    }

    const error = errors[field.key];

    return (
      <div
        key={field.key}
        className="space-y-2"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {field.label}
        </p>

        {field.kind === "textarea" ? (
          <Textarea
            rows={4}
            value={String(
              draft[field.key] ?? "",
            )}
            {...(field.placeholder
              ? {
                  placeholder:
                    field.placeholder,
                }
              : {})}
            aria-invalid={Boolean(error)}
            onChange={(event) =>
              setField(
                field.key,
                event.target.value,
              )
            }
          />
        ) : (
          <Input
            type={
              field.kind === "date"
                ? "date"
                : field.kind === "url"
                  ? "url"
                  : "text"
            }
            value={String(
              draft[field.key] ?? "",
            )}
            {...(field.placeholder
              ? {
                  placeholder:
                    field.placeholder,
                }
              : {})}
            aria-invalid={Boolean(error)}
            onChange={(event) =>
              setField(
                field.key,
                event.target.value,
              )
            }
          />
        )}

        {error && (
          <p className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-gold">
            Content
          </p>

          <h1 className="mt-3 font-display text-3xl font-semibold">
            {schema.label}
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        </div>

        <Button
          className="rounded-full"
          onClick={() => {
            setErrors({});
            setEditing({
              record: null,
              draft: emptyDraft(schema),
              status: "draft",
              scheduledFor: "",
            });
          }}
        >
          <Plus
            className="size-4"
            aria-hidden
          />
          New {schema.singular.toLowerCase()}
        </Button>
      </div>

      <div className="relative mt-8 max-w-sm">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />

        <Input
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
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
        <p className="mt-6 text-sm text-muted-foreground">
          {list.data.error.message}
        </p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Nothing here yet. Create a{" "}
          {schema.singular.toLowerCase()} and
          choose its publishing status.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const metadata = item.metadata ?? {};

            const preview =
              mediaUrl(
                getMediaRef(
                  metadata,
                  schema.previewField,
                ),
              ) ?? item.thumbnail_url;

            const published =
              item.status === "published";

            const StatusIcon = statusIcon(
              item.status,
            );

            return (
              <Card
                key={item.id}
                className="surface-panel overflow-hidden border-border"
              >
                {preview && (
                  <img
                    src={preview}
                    alt=""
                    className="aspect-video w-full object-cover"
                  />
                )}

                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-display text-base font-semibold">
                      {item.title ?? "Untitled"}
                    </h2>

                    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-gold/80">
                      <StatusIcon
                        className="size-3"
                        aria-hidden
                      />
                      {statusLabel(item.status)}
                    </span>
                  </div>

                  {item.category && (
                    <p className="text-xs text-muted-foreground">
                      {item.category}
                    </p>
                  )}

                  {item.status === "scheduled" &&
                    item.published_at && (
                      <p className="text-xs text-muted-foreground">
                        Scheduled for{" "}
                        {new Date(
                          item.published_at,
                        ).toLocaleString()}
                      </p>
                    )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setErrors({});

                        setEditing({
                          record: item,
                          draft: draftFromRecord(
                            schema,
                            item,
                          ),
                          status: item.status,
                          scheduledFor:
                            item.status ===
                            "scheduled"
                              ? isoToDateTimeLocal(
                                  item.published_at,
                                )
                              : "",
                        });
                      }}
                    >
                      <Pencil
                        className="size-4"
                        aria-hidden
                      />
                      Edit
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={
                        quickPublish.isPending
                      }
                      onClick={() =>
                        quickPublish.mutate(item)
                      }
                    >
                      {published ? (
                        <EyeOff
                          className="size-4"
                          aria-hidden
                        />
                      ) : (
                        <Eye
                          className="size-4"
                          aria-hidden
                        />
                      )}

                      {published
                        ? "Unpublish"
                        : "Publish"}
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setDeleting(item)
                      }
                    >
                      <Trash2
                        className="size-4"
                        aria-hidden
                      />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) =>
          !open && setEditing(null)
        }
      >
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing?.record
                ? `Edit ${schema.singular.toLowerCase()}`
                : `New ${schema.singular.toLowerCase()}`}
            </DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-6 py-2">
              {schema.fields.map((field) =>
                renderField(
                  field,
                  editing.draft,
                ),
              )}

              <div className="border-t border-border pt-5">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Publishing status
                  </p>

                  <Select
                    value={editing.status}
                    onValueChange={(value) =>
                      setStatus(
                        value as ContentStatus,
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose status" />
                    </SelectTrigger>

                    <SelectContent>
                      {CONTENT_STATUSES.map(
                        (status) => (
                          <SelectItem
                            key={status.value}
                            value={status.value}
                          >
                            {status.label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>

                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {statusDescription(
                      editing.status,
                    )}
                  </p>
                </div>

                {editing.status ===
                  "scheduled" && (
                  <div className="mt-5 space-y-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Publish date & time
                    </p>

                    <Input
                      type="datetime-local"
                      value={
                        editing.scheduledFor
                      }
                      min={new Date()
                        .toISOString()
                        .slice(0, 16)}
                      onChange={(event) => {
                        setErrors(
                          (current) => {
                            const next = {
                              ...current,
                            };
                            delete next.scheduledFor;
                            return next;
                          },
                        );

                        setEditing(
                          (current) =>
                            current
                              ? {
                                  ...current,
                                  scheduledFor:
                                    event.target
                                      .value,
                                }
                              : current,
                        );
                      }}
                    />

                    <p className="text-xs leading-relaxed text-muted-foreground">
                      This record remains hidden from
                      the public site while its status is
                      scheduled. The scheduled timestamp
                      is stored in{" "}
                      <code>published_at</code>.
                    </p>

                    {errors.scheduledFor && (
                      <p className="text-xs text-destructive">
                        {errors.scheduledFor}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() =>
                setEditing(null)
              }
            >
              Cancel
            </Button>

            <Button
              disabled={save.isPending}
              onClick={() =>
                editing &&
                save.mutate({
                  draft: editing.draft,
                  record: editing.record,
                  status: editing.status,
                  scheduledFor:
                    editing.scheduledFor,
                })
              }
            >
              {save.isPending
                ? "Saving..."
                : `Save ${statusLabel(
                    editing?.status ?? "draft",
                  ).toLowerCase()}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) =>
          !open && setDeleting(null)
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete{" "}
              {deleting?.title ??
                "this record"}
              ?
            </AlertDialogTitle>

            <AlertDialogDescription>
              It is removed from the public
              site immediately. The stored file
              stays in your Media Library.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={() => {
                if (deleting) {
                  destroy.mutate(deleting);
                }

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
