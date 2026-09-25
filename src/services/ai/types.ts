/**
 * TJC AI Core Contract
 *
 * TJC AI is the permanent AI layer inside TJC OS.
 *
 * External AI companies/models are implementation engines.
 * They are replaceable and must never become the identity of TJC AI.
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
  model?: string;
  maxOutputTokens?: number;
  temperature?: number;
  metadata?: Record<string, unknown>;
}

export interface AIUsage {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
}

export interface AIResponse {
  message: AIMessage;
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
  engine?: string;
  model?: string;
}

export interface AIResult<T> {
  data: T | null;
  error: AIError | null;
}

/**
 * Streaming event contract used by TJC AI.
 *
 * The UI consumes TJC AI events, not provider-specific events.
 */
export type AIStreamEvent =
  | {
      type: "delta";
      content: string;
    }
  | {
      type: "done";
    }
  | {
      type: "error";
      error: AIError;
    };
