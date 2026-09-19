import type { ActivityEntry } from "@/types";
import { services } from "@/services";

/** Stable event names currently emitted by TJC OS. */
export type TJCEventName =
  | "newsletter.subscriber.created"
  | "content.created"
  | "content.updated"
  | "content.published";

export interface TJCEvent {
  id: string;
  name: TJCEventName;
  occurredAt: string;
  actorId: string | null;
  entityType: string;
  entityId: string | null;
  source: string;
  payload: Record<string, unknown>;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

export type TJCEventHandler = (event: TJCEvent) => void | Promise<void>;

const handlers = new Map<TJCEventName, Set<TJCEventHandler>>();

function eventId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Provider-agnostic internal event bus. Events are persisted through the
 * existing activity-log service, while subscribers remain process-local until
 * a durable consumer is introduced by the Automation Center.
 */
export const internalEvents = {
  async emit(input: Omit<TJCEvent, "id" | "occurredAt" | "actorId">): Promise<TJCEvent> {
    const event: TJCEvent = {
      ...input,
      id: eventId(),
      occurredAt: new Date().toISOString(),
      actorId: null,
    };

    try {
      await services().activity.log({
        action: "event.emitted",
        resource: event.entityType,
        resourceId: event.entityId,
        metadata: {
          eventId: event.id,
          eventName: event.name,
          occurredAt: event.occurredAt,
          source: event.source,
          payload: event.payload,
          ...(event.correlationId ? { correlationId: event.correlationId } : {}),
          ...(event.metadata ?? {}),
        },
      });
    } catch {
      // Event persistence must never break the operation that emitted it.
    }

    const registered = handlers.get(event.name) ?? new Set<TJCEventHandler>();
    await Promise.all(
      [...registered].map(async (handler) => {
        try {
          await handler(event);
        } catch {
          // A consumer failure is isolated from the emitter and other consumers.
        }
      }),
    );

    return event;
  },

  subscribe(name: TJCEventName, handler: TJCEventHandler) {
    const registered = handlers.get(name) ?? new Set<TJCEventHandler>();
    registered.add(handler);
    handlers.set(name, registered);
    return () => registered.delete(handler);
  },

  async recent(limit = 100): Promise<ActivityEntry[]> {
    const result = await services().activity.list(limit);
    if (result.error) return [];
    return result.data.filter((entry) => entry.action === "event.emitted");
  },
};
