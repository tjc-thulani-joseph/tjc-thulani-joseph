# TJC OS — Project Status

Updated: September 2026

## Phase 0.2 — Public Homepage Experience Upgrade

**Status: IN PROGRESS**

The implementation is committed on `feature/phase-0-2-public-homepage`. It must not be considered IMPLEMENTED, VERIFIED, or COMPLETE until type checking, linting, building, testing, review, and available browser verification have been performed successfully.

### Scope in progress

- Preserve the existing TJC public layout, navigation, branding, SEO conventions, and Homepage Builder compatibility.
- Add published-content previews for music, video, gallery, projects, and news using the existing repository/service layer.
- Add a homepage newsletter CTA using the existing `newsletter` repository.
- Keep dynamic sections hidden when no published content is available.
- Reuse existing media URL resolution and public storage handling.

### Verification still required

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- Final diff and architecture review
- Responsive/browser verification at mobile, tablet, and desktop widths where available

## Phase 1 — Internal Event Architecture Foundation

**Status: IN PROGRESS**

Added a provider-agnostic internal event contract and process-local event bus backed by the existing activity-log service. The first real integration emits `newsletter.subscriber.created` after a successful newsletter subscription. Event persistence and handlers are isolated so event failures do not fail the original operation.

Database schema changes are not required at this stage. Existing activity logs remain audit records; emitted events are stored with `action: event.emitted` and structured metadata for future Automation Center and AI Center consumers.

Verification is pending. Future automation, AI, notifications, messaging, social publishing, payments, and Q Points consumers are not included.
