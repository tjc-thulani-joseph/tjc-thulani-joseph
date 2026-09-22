-- ============================================================================
-- TJC OS — Phase 3B visibility migration
-- Adds the first-class PRIVATE content status.
--
-- Safe to run after:
--   db/tjc_os_init.sql
--   db/tjc_os_phase3.sql
-- ============================================================================

-- ---------------------------------------------------------------- status ----
-- PostgreSQL enum values are additive here. We do not remove or rename
-- existing statuses because existing records may already use them.

alter type public.content_status
add value if not exists 'private';

-- ---------------------------------------------------------------- indexes ---
-- Keep the visibility contract fast across all public content tables.

do $$
declare
  t text;
  all_tables text[] := array[
    'media_library',
    'songs',
    'videos',
    'gallery',
    'posts',
    'biography',
    'projects',
    'homepage_sections',
    'navigation',
    'seo_settings',
    'site_configuration',
    'analytics',
    'products',
    'social_links'
  ];
begin
  foreach t in array all_tables loop
    execute format(
      'create index if not exists %I on public.%I (status, deleted_at, published_at)',
      t || '_visibility_idx',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------- contract --
-- Public visibility remains intentionally strict:
--
--   status = published
--   AND deleted_at IS NULL
--
-- Draft, private, scheduled and archived records remain staff-only.
--
-- Existing RLS policies already enforce this contract. This migration does
-- not weaken public access.
