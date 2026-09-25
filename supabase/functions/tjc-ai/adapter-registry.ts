import type {
  TJCAdapter,
} from "./adapters/types.ts";

import gemini from "./adapters/gemini.ts";

const ADAPTERS: Record<
  string,
  TJCAdapter
> = {
  gemini,
};

const DEFAULT_ADAPTER_ID =
  "gemini";

export function getAIAdapter(
  id: string,
): TJCAdapter | null {
  return ADAPTERS[id] ?? null;
}

export function getActiveAIAdapter():
  TJCAdapter | null {
  const configuredId =
    Deno.env
      .get("TJC_AI_ADAPTER")
      ?.trim();

  const adapterId =
    configuredId ||
    DEFAULT_ADAPTER_ID;

  return getAIAdapter(
    adapterId,
  );
}

export function listAIAdapters(): Array<{
  id: string;
  label: string;
}> {
  return Object.values(
    ADAPTERS,
  ).map((adapter) => ({
    id: adapter.id,
    label: adapter.label,
  }));
}
