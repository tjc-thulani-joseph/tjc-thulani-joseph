/**
 * TJC AI Core Contract
 *
 * This file defines the provider-neutral language used by TJC AI.
 *
 * IMPORTANT:
 * TJC OS must never depend directly on OpenAI, Gemini, Claude,
 * OpenRouter, or another AI provider.
 *
 * Providers will implement adapters around this contract later.
 */

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
  provider: string;
  capabilities: AICapability[];
}

export interface AIRequest {
  messages: AIMessage[];

  /**
   * Optional model requested by the caller.
   *
   * TJC AI does not assume a permanent model.
   * Provider routing may choose another compatible model.
   */
  model?: string;

  /**
   * Maximum output tokens requested by the caller.
   * Providers may translate this into their own parameter names.
   */
  maxOutputTokens?: number;

  /**
   * Sampling temperature when supported by the selected model.
   */
  temperature?: number;

  /**
   * Optional metadata used internally by TJC AI.
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
   * Provider/model information is returned as metadata,
   * not used as an application dependency.
   */
  model: string | null;
  provider: string | null;

  usage: AIUsage | null;

  /**
   * Provider-neutral request identifier when available.
   */
  requestId: string | null;

  /**
   * Additional provider-neutral metadata.
   */
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

  /**
   * True when retrying the same request may succeed.
   */
  retryable: boolean;

  /**
   * Optional provider/model information for diagnostics.
   */
  provider?: string;
  model?: string;
}

export interface AIResult<T> {
  data: T | null;
  error: AIError | null;
}
