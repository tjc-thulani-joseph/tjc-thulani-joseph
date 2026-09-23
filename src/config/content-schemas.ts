/**
 * Field definitions for the media content managers (songs, videos, gallery).
 * These describe how the existing generic content tables are used — no new
 * tables are introduced. Plain columns map to table columns; everything else
 * is stored in the record's `metadata` jsonb.
 */

export type FieldKind =
  | "text"
  | "textarea"
  | "date"
  | "boolean"
  | "media"
  | "url";

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
  resource:
    | "posts"
    | "songs"
    | "videos"
    | "gallery"
    | "biography"
    | "projects"
    | "homepage_sections";
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
      {
        key: "title",
        label: "Title",
        kind: "text",
        required: true,
        placeholder: "Post title",
      },
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
      {
        key: "title",
        label: "Title",
        kind: "text",
        required: true,
        placeholder: "Song title",
      },
      {
        key: "artist",
        label: "Artist",
        kind: "text",
        meta: true,
        placeholder: "Thulani Joseph",
      },
      {
        key: "album",
        label: "Album",
        kind: "text",
        meta: true,
        placeholder: "Album name",
      },
      {
        key: "category",
        label: "Genre",
        kind: "text",
        placeholder: "Afro soul",
      },
      {
        key: "release_date",
        label: "Release date",
        kind: "date",
        meta: true,
      },
      {
        key: "description",
        label: "Description",
        kind: "textarea",
        placeholder: "Short description",
      },
      {
        key: "cover",
        label: "Cover image",
        kind: "media",
        meta: true,
        bucket: "images",
        accept: "image/*",
        mirrorTo: "thumbnail_url",
      },
      {
        key: "cover_url",
        label: "External cover image URL (optional)",
        kind: "url",
        meta: true,
        placeholder: "https://example.com/cover.jpg",
      },
      {
        key: "audio",
        label: "Audio file",
        kind: "media",
        meta: true,
        bucket: "music",
        accept: "audio/*",
        mirrorTo: "url",
      },
      {
        key: "audio_url",
        label: "External audio URL (optional)",
        kind: "url",
        meta: true,
        placeholder: "https://example.com/song.mp3",
      },
      {
        key: "spotify_url",
        label: "Spotify",
        kind: "url",
        meta: true,
        placeholder: "https://open.spotify.com/track/...",
      },
      {
        key: "apple_music_url",
        label: "Apple Music",
        kind: "url",
        meta: true,
        placeholder: "https://music.apple.com/...",
      },
      {
        key: "soundcloud_url",
        label: "SoundCloud",
        kind: "url",
        meta: true,
        placeholder: "https://soundcloud.com/...",
      },
      {
        key: "youtube_url",
        label: "YouTube",
        kind: "url",
        meta: true,
        placeholder: "https://youtube.com/watch?v=...",
      },
    ],
  },

  videos: {
    resource: "videos",
    label: "Video Manager",
    singular: "Video",
    previewField: "thumbnail",
    fields: [
      {
        key: "title",
        label: "Title",
        kind: "text",
        required: true,
        placeholder: "Video title",
      },
      {
        key: "category",
        label: "Category",
        kind: "text",
        placeholder: "Live performance",
      },
      {
        key: "release_date",
        label: "Release date",
        kind: "date",
        meta: true,
      },
      {
        key: "description",
        label: "Description",
        kind: "textarea",
        placeholder: "Short description",
      },
      {
        key: "thumbnail",
        label: "Thumbnail",
        kind: "media",
        meta: true,
        bucket: "images",
        accept: "image/*",
        mirrorTo: "thumbnail_url",
      },
      {
        key: "thumbnail_url",
        label: "External thumbnail URL (optional)",
        kind: "url",
        meta: true,
        placeholder: "https://example.com/thumbnail.jpg",
      },
      {
        key: "video",
        label: "Video file",
        kind: "media",
        meta: true,
        bucket: "videos",
        accept: "video/*",
        mirrorTo: "url",
      },
      {
        key: "video_url",
        label: "External video URL (optional)",
        kind: "url",
        meta: true,
        placeholder: "https://example.com/video.mp4",
      },
      {
        key: "youtube_url",
        label: "YouTube",
        kind: "url",
        meta: true,
        placeholder: "https://youtube.com/watch?v=...",
      },
      {
        key: "vimeo_url",
        label: "Vimeo",
        kind: "url",
        meta: true,
        placeholder: "https://vimeo.com/...",
      },
      {
  key: "tiktok_url",
  label: "TikTok",
  kind: "url",
  meta: true,
  placeholder: "https://www.tiktok.com/@creator/video/...",
},
    ],
  },

  gallery: {
    resource: "gallery",
    label: "Gallery Manager",
    singular: "Photograph",
    previewField: "image",
    fields: [
      {
        key: "title",
        label: "Title",
        kind: "text",
        required: true,
        placeholder: "Photograph title",
      },
      {
        key: "category",
        label: "Album / category",
        kind: "text",
        placeholder: "Stage",
      },
      {
        key: "description",
        label: "Caption",
        kind: "textarea",
        placeholder: "Caption shown on the public gallery",
      },
      {
        key: "featured",
        label: "Featured",
        kind: "boolean",
        meta: true,
      },
      {
        key: "image",
        label: "Image",
        kind: "media",
        meta: true,
        bucket: "images",
        accept: "image/*",
        mirrorTo: "url",
        required: true,
      },
      {
        key: "image_url",
        label: "External image URL (optional)",
        kind: "url",
        meta: true,
        placeholder: "https://example.com/image.jpg",
      },
    ],
  },

  biography: {
    resource: "biography",
    label: "Biography",
    singular: "Biography",
    previewField: "profile_image",
    fields: [
      {
        key: "title",
        label: "Title",
        kind: "text",
        required: true,
        placeholder: "About TJC",
      },
      {
        key: "description",
        label: "Introduction",
        kind: "textarea",
        required: true,
        placeholder: "Short biography introduction",
      },
      {
        key: "body",
        label: "Biography",
        kind: "textarea",
        required: true,
        placeholder: "Full biography",
      },
      {
        key: "category",
        label: "Category",
        kind: "text",
        placeholder: "Personal brand",
      },
      {
        key: "tags",
        label: "Tags",
        kind: "text",
        meta: true,
        placeholder: "storytelling, music, acting",
      },
      {
        key: "profile_image",
        label: "Profile image",
        kind: "media",
        meta: true,
        bucket: "images",
        accept: "image/*",
        mirrorTo: "thumbnail_url",
      },
      {
        key: "profile_image_url",
        label: "External profile image URL (optional)",
        kind: "url",
        meta: true,
        placeholder: "https://example.com/profile.jpg",
      },
    ],
  },

  projects: {
    resource: "projects",
    label: "Projects",
    singular: "Project",
    previewField: "project_image",
    fields: [
      {
        key: "title",
        label: "Title",
        kind: "text",
        required: true,
        placeholder: "Project title",
      },
      {
        key: "description",
        label: "Description",
        kind: "textarea",
        required: true,
        placeholder: "Short project description",
      },
      {
        key: "body",
        label: "Project details",
        kind: "textarea",
        placeholder: "Detailed project information",
      },
      {
        key: "category",
        label: "Category",
        kind: "text",
        placeholder: "Film, music, business, creative project",
      },
      {
        key: "status",
        label: "Project status",
        kind: "text",
        meta: true,
        placeholder: "Active, completed, upcoming",
      },
      {
        key: "project_image",
        label: "Project image",
        kind: "media",
        meta: true,
        bucket: "images",
        accept: "image/*",
        mirrorTo: "thumbnail_url",
      },
      {
        key: "project_image_url",
        label: "External project image URL (optional)",
        kind: "url",
        meta: true,
        placeholder: "https://example.com/project.jpg",
      },
      {
        key: "project_url",
        label: "Project URL (optional)",
        kind: "url",
        meta: true,
        placeholder: "https://example.com/project",
      },
    ],
  },

  homepage_sections: {
    resource: "homepage_sections",
    label: "Homepage Builder",
    singular: "Homepage Section",
    previewField: "section_image",
    fields: [
      {
        key: "title",
        label: "Section title",
        kind: "text",
        required: true,
        placeholder: "Homepage section title",
      },
      {
        key: "description",
        label: "Description",
        kind: "textarea",
        placeholder: "Short section description",
      },
      {
        key: "body",
        label: "Content",
        kind: "textarea",
        placeholder: "Homepage section content",
      },
      {
        key: "category",
        label: "Section type",
        kind: "text",
        placeholder: "Hero, featured, about, music, video, etc.",
      },
      {
        key: "position",
        label: "Display order",
        kind: "text",
        placeholder: "1, 2, 3, 4...",
      },
      {
        key: "section_image",
        label: "Section image",
        kind: "media",
        meta: true,
        bucket: "images",
        accept: "image/*",
        mirrorTo: "thumbnail_url",
      },
      {
        key: "section_image_url",
        label: "External section image URL (optional)",
        kind: "url",
        meta: true,
        placeholder: "https://example.com/image.jpg",
      },
      {
        key: "section_url",
        label: "Section URL (optional)",
        kind: "url",
        meta: true,
        placeholder: "https://example.com/page",
      },
      {
        key: "featured",
        label: "Featured",
        kind: "boolean",
        meta: true,
      },
    ],
  },
};

export const getContentSchema = (resource: string | undefined) =>
  resource ? CONTENT_SCHEMAS[resource] : undefined;
