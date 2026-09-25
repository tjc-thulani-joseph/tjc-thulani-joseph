/**
 * TJC AI Engine Adapter Contract
 *
 * An engine adapter is the server-side implementation boundary
 * between TJC AI and an external AI backend.
 *
 * Example:
 *
 * TJC AI
 *   ↓
 * Gemini Engine Adapter
 *   ↓
 * Gemini API
 *
 * The adapter owns:
 * - authentication
 * - provider SDK/HTTP calls
 * - request translation
 * - response translation
 * - provider-specific errors
 * - retries
 * - provider quirks
 *
 * TJC OS application code must never call these external
 * services directly.
 */

import type {
  AICapability,
  AIModelDescriptor,
  AIRequest,
  AIResponse,
  AIResult,
} from "./types";

import type { AIEngineId } from "./engine-registry";

export interface AIEngineHealth {
  available: boolean;
  message: string | null;
}

export interface AIEngineAdapter {
  /**
   * Stable internal TJC engine identifier.
   */
  readonly engineId: AIEngineId;

  /**
   * Internal engine label.
   *
   * This is not the public TJC AI identity.
   */
  readonly label: string;

  /**
   * Capabilities supported by the engine adapter.
   */
  readonly capabilities: AICapability[];

  /**
   * Generate a provider-neutral TJC AI response.
   */
  generate(
    request: AIRequest,
  ): Promise<AIResult<AIResponse>>;

  /**
   * Return models currently available through this engine.
   */
  listModels(): Promise<
    AIResult<AIModelDescriptor[]>
  >;

  /**
   * Check engine availability.
   */
  health(): Promise<
    AIResult<AIEngineHealth>
  >;
}
