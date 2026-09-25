# TJC OS — Architecture

Public brand site (`TJC | Thulani Joseph`) + private management system (`TJC OS`).

## Stack

React 19 · TypeScript · Vite · TanStack Router/Query · Tailwind v4.

No backend SDK is imported directly by application features. Data access goes
through service contracts.

## Folder map

| Path | Purpose |
| --- | --- |
| `src/routes` | File-based routes. Public pages at top level, TJC OS under `_authenticated/`. |
| `src/components/layout` | Public site chrome. |
| `src/components/dashboard` | TJC OS shell and dashboard modules. |
| `src/components/ui` | Shared UI primitives. |
| `src/config` | Dashboard modules and integration registry. |
| `src/constants` | Brand and navigation source of truth. |
| `src/contexts` | Authentication, session and RBAC state. |
| `src/services` | Backend-agnostic service contracts and implementations. |
| `src/services/ai` | TJC AI contracts, engine registry and engine adapters. |
| `src/types` | Domain types and shared application types. |
| `src/assets` | Static and generated assets. |

## Data layer

`src/services/types.ts` defines the application service contracts.

`src/services/index.ts` is the service locator.

Backend implementations can be replaced without changing application
features that consume the service contracts.

## Records

Every table is expected to expose the `BaseRecord` envelope:

- `id`
- `created_at`
- `updated_at`
- `created_by`
- `updated_by`
- `status`
- `deleted_at`

Plus `slug` where addressable.

## Auth & RBAC

Roles:

`ceo > admin > editor > team > visitor`

The authenticated route is the central route gate.

Dashboard modules declare their minimum role.

Roles live in the dedicated roles system and are never treated as profile
metadata.

## Dashboard modules

`src/config/dashboard-modules.ts` is the module registry.

A module with a resource reads through the repository service.

Architecture-first modules such as TJC AI and Automation Center can exist
before their complete runtime implementation is connected.

## TJC AI architecture

TJC AI is the permanent intelligence layer inside TJC OS.

The architecture is:

```text
TJC OS
   ↓
TJC AI
   ↓
AI Engine Layer
   ↓
Engine Adapter
   ↓
External AI Backend
