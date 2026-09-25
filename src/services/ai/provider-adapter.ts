/**
 * TJC AI Engine Adapter Contract
 *
 * An engine adapter is the server-side implementation boundary
 * between TJC AI and an external AI backend.
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

export interface AIEngineStreamResult {
  stream: AsyncGenerator<string> | null;
  error: AIResult<never>["error"];
}

export interface AIEngineAdapter {
  readonly engineId: AIEngineId;

  readonly label: string;

  readonly capabilities: AICapability[];

  generate(
    request: AIRequest,
  ): Promise<AIResult<AIResponse>>;

  generateStream(
    request: AIRequest,
  ): Promise<AIEngineStreamResult>;

  listModels(): Promise<
    AIResult<AIModelDescriptor[]>
  >;

  health(): Promise<
    AIResult<AIEngineHealth>
  >;
}
