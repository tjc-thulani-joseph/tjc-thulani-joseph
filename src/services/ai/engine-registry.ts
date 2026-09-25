/**
 * TJC AI Engine Registry
 *
 * Engines are internal implementation choices used by TJC AI.
 *
 * IMPORTANT:
 * - TJC AI is the product identity.
 * - Engines are replaceable.
 * - Engine credentials never belong here.
 * - Engine SDKs never belong here.
 * - Browser code must never contain engine secrets.
 *
 * The first engine we intend to connect is Gemini.
 * That connection will be implemented separately.
 */

import type { AICapability } from "./types";

export type AIEngineId = "gemini";

export type AIEngineStatus =
  | "planned"
  | "configured"
  | "active"
  | "disabled";

export interface AIEngineDefinition {
  /**
   * Stable internal TJC identifier.
   */
  id: AIEngineId;

  /**
   * Internal implementation name.
   *
   * This is not the TJC AI product identity.
   */
  backend: string;

  /**
   * Internal description.
   */
  description: string;

  /**
   * Capabilities available through this engine.
   */
  capabilities: AICapability[];

  /**
   * Current architecture/configuration state.
   */
  status: AIEngineStatus;

  /**
   * Whether this engine may be selected as the
   * default runtime engine.
   */
  selectable: boolean;
}

/**
 * TJC AI engines currently known to the system.
 *
 * Only Gemini is being prepared initially.
 * Additional engines can be added later without
 * changing the TJC AI application contract.
 */
export const AI_ENGINES: AIEngineDefinition[] = [
  {
    id: "gemini",
    backend: "google-gemini",
    description:
      "Initial backend engine for TJC AI text, multimodal and tool-enabled capabilities.",
    capabilities: [
      "text",
      "structured_output",
      "streaming",
      "vision",
      "embeddings",
      "image_generation",
      "audio",
      "transcription",
      "tool_calling",
      "reasoning",
    ],
    status: "planned",
    selectable: true,
  },
];

export function getAIEngine(
  id: AIEngineId,
): AIEngineDefinition | null {
  return (
    AI_ENGINES.find((engine) => engine.id === id) ?? null
  );
}

export function getSelectableAIEngines(): AIEngineDefinition[] {
  return AI_ENGINES.filter((engine) => engine.selectable);
}

export function getActiveAIEngine(): AIEngineDefinition | null {
  return (
    AI_ENGINES.find(
      (engine) =>
        engine.status === "active" &&
        engine.selectable,
    ) ?? null
  );
}
