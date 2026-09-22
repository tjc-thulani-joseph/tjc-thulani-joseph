/**
 * Field definitions for the existing content managers.
 * Plain columns map to table columns; fields marked `meta` are stored in the
 * record's metadata jsonb so the existing generic content tables remain intact.
 */

export type FieldKind = "text" | "textarea" | "date" | "boolean" | "media" | "url";

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
  resource: "posts" | "songs" | "videos" | "gallery";
  label: string;
  singular: string;
  /** Media field whose preview drives the card in the manager list. */
  previewField: string;
  fields: FieldDef[];
}

export const CONTENT_SCHEMAS: Record<string, ContentSchema> = {
  posts: {
    resource: "posts",
    label: "Blog Manager",
    singular: "Post",
    previewField: "featured_image",
    fields: [
      { key: "title", label: "Title", kind: "text", required: true, placeholder: "Post title" },
      {
        key: "description",
        label: "Excerpt",
        kind: "textarea",
        required: true,
        placeholder: "Short introduction shown on the public blog",
      },
      {
        key: "body",
        label: "Content",
        kind: "textarea",
        required: true,
        placeholder: "Write the post content",
      },
      {
        key: "category",
        label: "Category",
        kind: "text",
        placeholder: "Journal, announcement, or reflection",
      },
      {
        key: "tags",
        label: "Tags",
        kind: "text",
        meta: true,
        placeholder: "creative, music, filmmaking",
      },
      {
        key: "featured_image",
        label: "Featured image",
        kind: "media",
        meta: true,
        bucket: "images",
        accept: "image/*",
        mirrorTo: "thumbnail_url",
      },
      {
        key: "featured_image_url",
        label: "External featured image URL (optional)",
        kind: "url",
        meta: true,
        placeholder: "https://example.com/image.jpg",
      },
    ],
  },
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
      { key: "cover_url", label: "External cover image URL (optional)", kind: "url", meta: true, placeholder: "https://example.com/cover.jpg" },
      { key: "audio", label: "Audio file", kind: "media", meta: true, bucket: "music", accept: "audio/*", mirrorTo: "url" },
      { key: "audio_url", label: "External audio URL (optional)", kind: "url", meta: true, placeholder: "https://example.com/song.mp3" },
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
      { key: "thumbnail_url", label: "External thumbnail URL (optional)", kind: "url", meta: true, placeholder: "https://example.com/thumbnail.jpg" },
      { key: "video", label: "Video file", kind: "media", meta: true, bucket: "videos", accept: "video/*", mirrorTo: "url" },
      { key: "video_url", label: "External video URL (optional)", kind: "url", meta: true, placeholder: "https://example.com/video.mp4" },
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
      { key: "image_url", label: "External image URL (optional)", kind: "url", meta: true, placeholder: "https://example.com/image.jpg" },
    ],
  },
};

export const getContentSchema = (resource: string | undefined) =>
  resource ? CONTENT_SCHEMAS[resource] : undefined;
