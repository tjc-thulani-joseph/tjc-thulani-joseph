import { supabase } from "@/lib/supabase";
import type {
  ActivityService, AuthService, ListQuery, Page, PeopleService, Repository, ServiceContainer,
  StorageObject, StorageService, TeamMember, UploadOptions,
} from "../types";
import type { ActivityEntry, AuthSession, BaseRecord, Result, Role } from "@/types";

/**
 * Supabase provider. Implements the same contracts as every other provider,
 * so nothing outside src/services knows which backend is in use.
 */

const client = () => {
  if (!supabase) throw new Error("Supabase client unavailable");
  return supabase;
};

const ok = <T>(data: T): Result<T> => ({ data, error: null });
const err = (code: string, message: string) => ({ data: null, error: { code, message } }) as const;

async function buildSession(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null, expiresAt: number | null): Promise<AuthSession | null> {
  if (!user) return null;
  const sb = client();

  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    sb.from("profiles").select("display_name, avatar_url").eq("id", user.id).maybeSingle(),
    sb.from("user_roles").select("role").eq("user_id", user.id),
  ]);

  const roles = ((roleRows ?? []) as { role: Role }[]).map((row) => row.role);

  return {
    user: {
      id: user.id,
      email: user.email ?? "",
      displayName:
        (profile as { display_name?: string | null } | null)?.display_name ??
        (user.user_metadata?.["display_name"] as string | undefined) ??
        null,
      avatarUrl: (profile as { avatar_url?: string | null } | null)?.avatar_url ?? null,
      roles,
    },
    expiresAt: expiresAt ? new Date(expiresAt * 1000).toISOString() : null,
  };
}

/** Network failures surface as "Failed to fetch" — translate them into something actionable. */
const isNetworkError = (error: unknown) =>
  error instanceof TypeError ||
  /failed to fetch|network|load failed|fetch failed/i.test(
    (error as { message?: string } | null)?.message ?? "",
  );

const UNREACHABLE_MESSAGE =
  "Cannot reach the backend at " +
  ((import.meta.env['VITE_SUPABASE_URL'] as string | undefined) ?? "the configured address") +
  ". Check that the project URL and key in .env are correct and the project is active.";

const auth: AuthService = {
  async getSession() {
    try {
      const { data } = await client().auth.getSession();
      if (!data.session) return null;
      const { data: verified } = await client().auth.getUser();
      if (!verified.user) return null;
      return buildSession(verified.user, data.session.expires_at ?? null);
    } catch {
      return null;
    }
  },

  async signIn({ email, password }) {
    try {
      const { data, error } = await client().auth.signInWithPassword({ email, password });
      if (error) {
        if (isNetworkError(error)) return err("auth_unreachable", UNREACHABLE_MESSAGE);
        return err("auth_sign_in_failed", error.message);
      }
      const session = await buildSession(data.user, data.session?.expires_at ?? null);
      if (!session) return err("auth_sign_in_failed", "Could not establish a session.");
      return ok(session);
    } catch (caught) {
      if (isNetworkError(caught)) return err("auth_unreachable", UNREACHABLE_MESSAGE);
      return err("auth_sign_in_failed", (caught as Error)?.message ?? "Sign in failed.");
    }
  },

  async signOut() {
    const { error } = await client().auth.signOut();
    return error ? err("auth_sign_out_failed", error.message) : ok(null);
  },

  async requestPasswordReset(email) {
    const { error } = await client().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return error ? err("auth_reset_failed", error.message) : ok(null);
  },

  async updatePassword(password) {
    const { error } = await client().auth.updateUser({ password });
    return error ? err("auth_update_password_failed", error.message) : ok(null);
  },

  onAuthStateChange(listener) {
    const { data } = client().auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED") return;
      if (!session) {
        listener(null);
        return;
      }
      void buildSession(session.user, session.expires_at ?? null).then(listener);
    });
    return () => data.subscription.unsubscribe();
  },
};

const storage: StorageService = {
  async upload(bucket, path, file) {
    const { error } = await client().storage.from(bucket).upload(path, file, { upsert: true });
    if (error) return err("storage_upload_failed", error.message);
    return ok({ url: client().storage.from(bucket).getPublicUrl(path).data.publicUrl });
  },

  /** Real byte-level progress: the JS client has no progress events, so we call the Storage REST API directly. */
  async uploadWithProgress(bucket, path, file, options: UploadOptions = {}) {
    const sb = client();
    const { data: sessionData } = await sb.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return err("storage_upload_failed", "You must be signed in to upload files.");

    const base = (import.meta.env['VITE_SUPABASE_URL'] as string).replace(/\/$/, "");
    const endpoint = `${base}/storage/v1/object/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;

    const result = await new Promise<Result<null>>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open(options.upsert ? "PUT" : "POST", endpoint, true);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("x-upsert", options.upsert ? "true" : "false");
      if (file.type) xhr.setRequestHeader("Content-Type", file.type);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) options.onProgress?.(Math.round((event.loaded / event.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) return resolve(ok(null));
        let message = `Upload failed (${xhr.status}).`;
        try {
          const parsed = JSON.parse(xhr.responseText) as { message?: string; error?: string };
          message = parsed.message ?? parsed.error ?? message;
        } catch { /* keep default message */ }
        resolve(err("storage_upload_failed", message));
      };
      xhr.onerror = () => resolve(err("storage_upload_failed", "Network error during upload."));
      xhr.onabort = () => resolve(err("storage_upload_aborted", "Upload cancelled."));
      options.signal?.addEventListener("abort", () => xhr.abort());
      xhr.send(file);
    });

    if (result.error) return err(result.error.code, result.error.message);
    return ok({ url: sb.storage.from(bucket).getPublicUrl(path).data.publicUrl });
  },

  async list(bucket, prefix = "") {
    const { data, error } = await client()
      .storage.from(bucket)
      .list(prefix, { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
    if (error) return err("storage_list_failed", error.message);

    const rows = (data ?? []).filter((entry) => entry.id !== null);
    const items: StorageObject[] = rows.map((entry) => {
      const metadata = (entry.metadata ?? {}) as { size?: number; mimetype?: string };
      return {
        name: entry.name,
        path: prefix ? `${prefix}/${entry.name}` : entry.name,
        bucket,
        size: metadata.size ?? 0,
        mimeType: metadata.mimetype ?? null,
        createdAt: entry.created_at ?? null,
        updatedAt: entry.updated_at ?? null,
        owner: (entry as { owner?: string | null }).owner ?? null,
      };
    });
    return ok(items);
  },

  async move(bucket, from, to) {
    const { error } = await client().storage.from(bucket).move(from, to);
    return error ? err("storage_move_failed", error.message) : ok(null);
  },

  async signedUrl(bucket, path, expiresIn = 3600) {
    const { data, error } = await client().storage.from(bucket).createSignedUrl(path, expiresIn);
    if (error || !data) return err("storage_signed_url_failed", error?.message ?? "Could not create a link.");
    return ok({ url: data.signedUrl });
  },

  async remove(bucket, path) {
    const { error } = await client().storage.from(bucket).remove([path]);
    return error ? err("storage_remove_failed", error.message) : ok(null);
  },
  publicUrl: (bucket, path) => client().storage.from(bucket).getPublicUrl(path).data.publicUrl,
};

function repository<T extends BaseRecord>(resource: string): Repository<T> {
  const table = () => client().from(resource);

  return {
    async list(query: ListQuery = {}) {
      const page = query.page ?? 1;
      const perPage = query.perPage ?? 24;
      const from = (page - 1) * perPage;

      let request = table()
        .select("*", { count: "exact" })
        .is("deleted_at", null)
        .order(query.orderBy ?? "created_at", { ascending: query.ascending ?? false })
        .range(from, from + perPage - 1);

      if (query.status) request = request.eq("status", query.status);
      if (query.search) {
        const fields = query.searchFields ?? ["title", "description"];
        const term = query.search.replace(/[%,()]/g, " ").trim();
        if (term) request = request.or(fields.map((field) => `${field}.ilike.%${term}%`).join(","));
      }

      const { data, error, count } = await request;
      if (error) return err("list_failed", error.message);
      return ok<Page<T>>({ items: (data ?? []) as T[], total: count ?? 0 });
    },

    async getBySlugOrId(key) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
      const { data, error } = await table().select("*").eq(isUuid ? "id" : "slug", key).is("deleted_at", null).maybeSingle();
      if (error) return err("get_failed", error.message);
      return ok((data ?? null) as T | null);
    },

    async create(input) {
      const { data, error } = await table().insert(input as never).select().single();
      if (error) return err("create_failed", error.message);
      return ok(data as T);
    },

    async update(id, input) {
      const { data, error } = await table().update(input as never).eq("id", id).select().single();
      if (error) return err("update_failed", error.message);
      return ok(data as T);
    },

    async softDelete(id) {
      const { error } = await table().update({ deleted_at: new Date().toISOString() } as never).eq("id", id);
      return error ? err("delete_failed", error.message) : ok(null);
    },

    async remove(id) {
      const { error } = await table().delete().eq("id", id);
      return error ? err("delete_failed", error.message) : ok(null);
    },

    async upsertBySlug(slug, input) {
      const { data, error } = await table()
        .upsert({ ...(input as object), slug } as never, { onConflict: "slug" })
        .select()
        .single();
      if (error) return err("save_failed", error.message);
      return ok(data as T);
    },
  };
}

const people: PeopleService = {
  async list() {
    const sb = client();
    const [{ data: profiles, error }, { data: roleRows, error: roleError }] = await Promise.all([
      sb.from("profiles").select("id, email, display_name, avatar_url, created_at").order("created_at"),
      sb.from("user_roles").select("user_id, role"),
    ]);
    if (error) return err("people_list_failed", error.message);
    if (roleError) return err("people_list_failed", roleError.message);

    const byUser = new Map<string, Role[]>();
    for (const row of (roleRows ?? []) as { user_id: string; role: Role }[]) {
      byUser.set(row.user_id, [...(byUser.get(row.user_id) ?? []), row.role]);
    }

    const rows = (profiles ?? []) as {
      id: string; email: string | null; display_name: string | null; avatar_url: string | null; created_at: string | null;
    }[];
    return ok<TeamMember[]>(
      rows.map((row) => ({
        id: row.id,
        email: row.email,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
        roles: byUser.get(row.id) ?? [],
        createdAt: row.created_at,
      })),
    );
  },

  async grantRole(userId, role) {
    const { error } = await client().from("user_roles").insert({ user_id: userId, role } as never);
    return error ? err("role_grant_failed", error.message) : ok(null);
  },

  async revokeRole(userId, role) {
    const { error } = await client().from("user_roles").delete().eq("user_id", userId).eq("role", role);
    return error ? err("role_revoke_failed", error.message) : ok(null);
  },
};

const activity: ActivityService = {
  async log(entry) {
    try {
      const sb = client();
      const { data } = await sb.auth.getUser();
      if (!data.user) return;
      await sb.from("activity_logs").insert({
        actor_id: data.user.id,
        action: entry.action,
        resource: entry.resource ?? null,
        resource_id: entry.resourceId ?? null,
        metadata: entry.metadata ?? {},
      } as never);
    } catch {
      /* logging must never break the action it describes */
    }
  },

  async list(limit = 100) {
    const { data, error } = await client()
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return err("activity_list_failed", error.message);
    return ok((data ?? []) as ActivityEntry[]);
  },
};

export const supabaseServices: ServiceContainer = {
  auth,
  storage,
  people,
  activity,
  repository: <T extends BaseRecord>(resource: string) => repository<T>(resource),
};