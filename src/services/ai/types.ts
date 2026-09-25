/**
 * TJC AI Core Contract
 *
 * TJC AI is the permanent AI layer inside TJC OS.
 *
 * External AI companies/models are implementation engines.
 * They are replaceable and must never become the identity of TJC AI.
 *
 * IMPORTANT:
 * TJC OS application features communicate with TJC AI contracts.
 * They do not communicate directly with Gemini, OpenAI, Claude,
 * OpenRouter, or another external AI system.
 */

export const TJC_AI_IDENTITY = {
  id: "tjc-ai",
  name: "TJC AI",
  description: "The intelligence layer inside TJC OS.",
} as const;

export type AIMessageRole =
  | "system"
  | "user"
  | "assistant"
  | "tool";

export interface AIMessage {
  role: AIMessageRole;
  content: string;
}

export type AICapability =
  | "text"
  | "structured_output"
  | "streaming"
  | "vision"
  | "embeddings"
  | "image_generation"
  | "audio"
  | "speech"
  | "transcription"
  | "tool_calling"
  | "reasoning";

export interface AIModelDescriptor {
  id: string;
  label: string;
  capabilities: AICapability[];
}

export interface AIRequest {
  messages: AIMessage[];

  /**
   * Optional model requested by the TJC AI caller.
   *
   * TJC AI may route this request to another compatible
   * model if the requested model is unavailable.
   */
  model?: string;

  maxOutputTokens?: number;

  temperature?: number;

  /**
   * Internal metadata used by TJC AI.
   */
  metadata?: Record<string, unknown>;
}

export interface AIUsage {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
}

export interface AIResponse {
  message: AIMessage;

  /**
   * The model that actually handled the request.
   *
   * This is diagnostic metadata, not an application dependency.
   */
  model: string | null;

  usage: AIUsage | null;

  requestId: string | null;

  metadata?: Record<string, unknown>;
}

export interface AIToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AIError {
  code: string;
  message: string;
  retryable: boolean;

  /**
   * Internal diagnostic information.
   *
   * These fields must not be used to present an external
   * AI provider as the TJC AI product identity.
   */
  engine?: string;
  model?: string;
}

export interface AIResult<T> {
  data: T | null;
  error: AIError | null;
}
