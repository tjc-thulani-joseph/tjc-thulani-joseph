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

/**
 * Provider-neutral function declaration.
 *
 * TJC AI owns this contract.
 * Individual providers translate it into
 * their own native function/tool format.
 */
export interface TJCAdapterTool {
  name: string;
  description: string;

  parameters: {
    type: "object";
    properties: Record<
      string,
      {
        type: string;
        description?: string;
        enum?: string[];
        items?: Record<string, unknown>;
      }
    >;
    required?: string[];
  };
}

/**
 * A function call requested by an external
 * AI engine.
 *
 * The engine does NOT execute this call.
 * TJC AI validates, authorizes and executes it.
 */
export interface TJCAdapterToolCall {
  id: string | null;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Result of a TJC-owned tool execution.
 *
 * This is sent back through the adapter so
 * the external engine can continue reasoning.
 */
export interface TJCAdapterToolResult {
  id: string | null;
  name: string;
  result: Record<string, unknown>;
}

export interface TJCAdapterRequest {
  messages: TJCAdapterMessage[];

  /**
   * Tools currently available to TJC AI.
   *
   * These are TJC-owned tools.
   * The adapter only translates them for
   * the selected external AI engine.
   */
  tools?: TJCAdapterTool[];

  /**
   * Tool calls previously returned by the
   * external engine during this orchestration turn.
   *
   * TJC AI includes these when sending the
   * corresponding tool results back to the engine.
   */
  toolCalls?: TJCAdapterToolCall[];

  /**
   * Results produced by TJC-owned tools.
   *
   * The adapter translates these into the
   * provider-specific function response format.
   */
  toolResults?: TJCAdapterToolResult[];

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
   * Tool calls requested by the external engine.
   *
   * These are suggestions from the engine only.
   * TJC AI must validate and authorize them before
   * any execution occurs.
   */
  toolCalls: TJCAdapterToolCall[];

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
   *
   * Tool orchestration is handled through the
   * complete-response contract above so that
   * structured tool calls never get flattened
   * into plain text.
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
