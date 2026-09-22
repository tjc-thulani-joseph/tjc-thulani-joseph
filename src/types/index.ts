/** Shared domain types. Backend-agnostic by design. */

export type UUID = string;

export type ContentStatus =
  | "draft"
  | "private"
  | "scheduled"
  | "published"
  | "archived";

/** Every persisted record in TJC OS carries this envelope. */
export interface BaseRecord {
  id: UUID;
  created_at: string;
  updated_at: string;
  created_by: UUID | null;
  updated_by: UUID | null;
  deleted_at: string | null;
  status: ContentStatus;
}

export type Role = "ceo" | "admin" | "editor" | "team" | "visitor";

export const ROLE_RANK: Record<Role, number> = {
  ceo: 100,
  admin: 80,
  editor: 60,
  team: 40,
  visitor: 0,
};

export interface AuthUser {
  id: UUID;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  roles: Role[];
}

export interface AuthSession {
  user: AuthUser;
  expiresAt: string | null;
}

export interface Credentials {
  email: string;
  password: string;
}

export type Result<T> =
  | { data: T; error: null }
  | { data: null; error: ServiceError };

export interface ServiceError {
  code: string;
  message: string;
}

/** A row of the audit trail. */
export interface ActivityEntry {
  id: UUID;
  actor_id: UUID | null;
  action: string;
  resource: string | null;
  resource_id: UUID | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** Content record shared by every CMS table (the generic TJC OS envelope). */
export interface ContentRecord extends BaseRecord {
  title: string | null;
  slug: string | null;
  description: string | null;
  body: string | null;
  url: string | null;
  thumbnail_url: string | null;
  category: string | null;
  tags: string[] | null;
  metadata: Record<string, unknown>;
  position: number | null;
  published_at: string | null;
}
