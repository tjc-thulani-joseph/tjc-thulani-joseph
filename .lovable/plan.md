# TJC OS Living Public Homepage

## Goal
Transform the existing public homepage into a cinematic, content-led TJC headquarters while preserving the current dark/gold identity, navigation, footer, routes, CMS lifecycle, service abstraction, and storage model.

## Implementation
1. **Compose real homepage data**
   - Add one reusable homepage query layer that reads published, non-deleted songs, videos, gallery images, projects, posts, biography, and configured homepage sections through the existing repository service.
   - Order by existing publication/position fields, limit payloads for homepage previews, and treat failed or empty feeds as hidden sections rather than visible errors.
   - Keep canonical media references in `metadata` and resolve them with the existing media resolver; no direct storage URLs or new tables.

2. **Upgrade the cinematic opening**
   - Rework only the public homepage hero using the existing TJC backdrop and identity.
   - Present Thulani Joseph as Emotional Storyteller, Emotional Actor, and Emotional Rapper with clearer CTA hierarchy for Music, Story, and Contact.
   - Add restrained CSS-only depth and reveal motion, with reduced-motion fallbacks and mobile-safe framing.

3. **Build living content previews**
   - Add conditional homepage sections for current/featured content, music, visual stories, gallery, projects, and latest updates.
   - Use real audio/video controls only when valid public media resolves.
   - Prefer legitimate `featured` metadata when available; otherwise use latest published content without popularity claims.
   - Use editorial/asymmetric layouts and graceful media fallbacks; every section links to its existing destination.

4. **Complete the homepage journey**
   - Add concise Story and Create with TJC bands linked to the existing About and Contact routes.
   - Preserve and refine the existing Explore the Work navigation as the deeper-exploration gateway.
   - Add a premium newsletter signup using the existing `newsletter` repository and no parallel system.

5. **Repair and polish within scope**
   - Make the crest source resilient so header/footer never show a broken image.
   - Extend existing semantic design tokens/utilities only where the homepage needs them; no app-wide redesign or new dependency.
   - Preserve and complete homepage metadata with unique title, description, Open Graph type, and Twitter card.

## Technical details
- Keep TanStack Router, TanStack Query, the `services()` repository contract, and existing public media resolver.
- No database migration is expected: current tables and `metadata` fields support the experience.
- Query keys will be stable and public data will refresh on mount/focus so publishing changes appear without redeploying.
- Missing images use intentional text-led treatments rather than broken elements; media starts only by visitor action.

## Verification
- Run TypeScript checks, lint, and the production build; fix regressions caused by this work.
- Exercise the homepage in the live preview at mobile, tablet, desktop, and large desktop sizes.
- Confirm no horizontal overflow, working keyboard/touch targets, reduced-motion behavior, valid crest rendering, and no console/network errors.
- Verify the currently published song renders from its canonical media reference and that all empty content categories leave no blank sections.
