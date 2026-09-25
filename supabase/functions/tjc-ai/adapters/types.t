/**
 * TJC AI Adapter Contract
 *
 * This is the permanent boundary between TJC AI
 * and external AI engines.
 *
 * TJC AI owns:
 * - identity
 * - context
 * - knowledge
 * - memory
 * - tools
 * - permissions
 * - automation
 * - audit
 *
 * Adapters only translate TJC AI requests/responses
 * to and from an external AI engine.
 *
 * An external provider must never become the owner
 * of TJC AI state.
 */

export type TJCMessageRole =
  | "system"
  | "user"
  | "assistant"
  | "tool";

export interface TJCAdapterMessage {
  role: TJCMessageRole;
  content: string;
}

export interface TJCAdapterRequest {
  messages: TJCAdapterMessage[];

  /**
   * Optional provider-specific model identifier.
   *
   * TJC AI may supply this, but the provider does
   * not control TJC AI identity or state.
   */
  model?: string;

  maxOutputTokens?: number;

  temperature?: number;

  /**
   * TJC-owned metadata.
   *
   * Adapters may use relevant values while translating
   * the request, but must not persist or claim ownership
   * of this state.
   */
  metadata?: Record<string, unknown>;
}

export interface TJCAdapterUsage {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
}

export interface TJCAdapterResponse {
  message: {
    role: "assistant";
    content: string;
  };

  /**
   * Actual engine/model used for this response.
   * This is informational only.
   */
  model: string | null;

  /**
   * Adapter identifier.
   */
  adapter: string;

  usage: TJCAdapterUsage | null;

  requestId: string | null;
}

export interface TJCAdapterError {
  code: string;
  message: string;
  retryable: boolean;

  /**
   * Adapter/provider information is diagnostic metadata.
   * It is never the TJC AI identity.
   */
  adapter?: string;

  model?: string;
}

export interface TJCAdapterResult<T> {
  data: T | null;
  error: TJCAdapterError | null;
}

export interface TJCAdapter {
  /**
   * Stable internal adapter identifier.
   *
   * Example:
   * "gemini"
   * "openai"
   * "claude"
   */
  readonly id: string;

  /**
   * Human-readable adapter name.
   */
  readonly label: string;

  /**
   * Generate one complete response.
   */
  generate(
    request: TJCAdapterRequest,
  ): Promise<TJCAdapterResult<TJCAdapterResponse>>;

  /**
   * Generate a streaming response.
   *
   * The adapter exposes plain text chunks.
   * Provider-specific streaming formats remain
   * completely inside the adapter.
   */
  generateStream?(
    request: TJCAdapterRequest,
  ): Promise<
    TJCAdapterResult<{
      stream: AsyncIterable<string>;
    }>
  >;

  /**
   * Optional model discovery.
   */
  listModels?(): Promise<
    TJCAdapterResult<
      Array<{
        id: string;
        label: string;
        capabilities: string[];
      }>
    >
  >;

  /**
   * Optional health check.
   */
  health?(): Promise<
    TJCAdapterResult<{
      available: boolean;
      message: string | null;
    }>
  >;
}
