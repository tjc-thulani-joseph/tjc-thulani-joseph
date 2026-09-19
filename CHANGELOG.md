# Changelog

## September 2026

### In progress — Phase 1 Internal Event Architecture Foundation

- Added a typed, provider-agnostic internal event contract and process-local event bus.
- Reused `activity_logs` for optional event persistence without adding a new database table.
- Added the first real integration: `newsletter.subscriber.created` after successful subscriber creation.
- Isolated event persistence and consumer failures from the originating operation.

## September 2026 — Phase 0.2

### In progress — Public Homepage Experience Upgrade

- Added the feature-branch implementation for dynamic published music, video, gallery, project, and news previews.
- Added the homepage newsletter subscription CTA using the existing subscriber repository.
- Preserved the existing public layout, navigation, media handling, and Homepage Builder architecture.
- Verification is pending; this phase is not yet marked VERIFIED or COMPLETE.
