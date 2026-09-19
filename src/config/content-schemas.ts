/**
 * Field definitions for the media content managers (songs, videos, gallery).
 * These describe how the existing generic content tables are used — no new
 * tables are introduced. Plain columns map to table columns; everything else
 * is stored in the record's `metadata` jsonb.
 */

export type FieldKind = "text" | "textarea" | "date" | "boolean" | "media";

export interface FieldDef {
  /** Key in the record (column) or in metadata when `meta` is true. */
  key: string;
  label: string;
  kind: FieldKind;
  meta?: boolean;
  placeholder?: string;
  /** Storage bucket for media fields. */
  bucket?: "images" | "music" | "videos";
  accept?: string;
  /** Mirror the derived URL onto this column for backwards compatibility. */
  mirrorTo?: "url" | "thumbnail_url";
  required?: boolean;
}

export interface ContentSchema {
  resource: "songs" | "videos" | "gallery";
  label: string;
  singular: string;
  /** Media field whose preview drives the card in the manager list. */
  previewField: string;
  fields: FieldDef[];
}

export const CONTENT_SCHEMAS: Record<string, ContentSchema> = {
  songs: {
    resource: "songs",
    label: "Music Manager",
    singular: "Song",
    previewField: "cover",
    fields: [
      { key: "title", label: "Title", kind: "text", required: true, placeholder: "Song title" },
      { key: "artist", label: "Artist", kind: "text", meta: true, placeholder: "Thulani Joseph" },
      { key: "album", label: "Album", kind: "text", meta: true, placeholder: "Album name" },
      { key: "category", label: "Genre", kind: "text", placeholder: "Afro soul" },
      { key: "release_date", label: "Release date", kind: "date", meta: true },
      { key: "description", label: "Description", kind: "textarea", placeholder: "Short description" },
      { key: "cover", label: "Cover image", kind: "media", meta: true, bucket: "images", accept: "image/*", mirrorTo: "thumbnail_url" },
      { key: "audio", label: "Audio file", kind: "media", meta: true, bucket: "music", accept: "audio/*", mirrorTo: "url" },
    ],
  },
  videos: {
    resource: "videos",
    label: "Video Manager",
    singular: "Video",
    previewField: "thumbnail",
    fields: [
      { key: "title", label: "Title", kind: "text", required: true, placeholder: "Video title" },
      { key: "category", label: "Category", kind: "text", placeholder: "Live performance" },
      { key: "release_date", label: "Release date", kind: "date", meta: true },
      { key: "description", label: "Description", kind: "textarea", placeholder: "Short description" },
      { key: "thumbnail", label: "Thumbnail", kind: "media", meta: true, bucket: "images", accept: "image/*", mirrorTo: "thumbnail_url" },
      { key: "video", label: "Video file", kind: "media", meta: true, bucket: "videos", accept: "video/*", mirrorTo: "url" },
    ],
  },
  gallery: {
    resource: "gallery",
    label: "Gallery Manager",
    singular: "Photograph",
    previewField: "image",
    fields: [
      { key: "title", label: "Title", kind: "text", required: true, placeholder: "Photograph title" },
      { key: "category", label: "Album / category", kind: "text", placeholder: "Stage" },
      { key: "description", label: "Caption", kind: "textarea", placeholder: "Caption shown on the public gallery" },
      { key: "featured", label: "Featured", kind: "boolean", meta: true },
      { key: "image", label: "Image", kind: "media", meta: true, bucket: "images", accept: "image/*", mirrorTo: "url", required: true },
    ],
  },
};

export const getContentSchema = (resource: string | undefined) =>
  resource ? CONTENT_SCHEMAS[resource] : undefined;
