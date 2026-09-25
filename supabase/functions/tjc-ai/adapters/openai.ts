/**
 * TJC AI — OpenAI Provider Adapter
 *
 * This adapter is the ONLY layer that knows how to communicate
 * with OpenAI.
 *
 * TJC OS and the TJC AI gateway remain provider-neutral.
 *
 * IMPORTANT:
 * OPENAI_API_KEY must exist only as a Supabase Edge Function secret.
 * Never place it in GitHub, frontend code, or chat.
 */

export interface AIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
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
  message: {
    role: "assistant";
    content: string;
  };
  model: string | null;
  provider: string;
  usage: AIUsage | null;
  requestId: string | null;
}

export interface AIError {
  code: string;
  message: string;
  retryable: boolean;
  provider?: string;
  model?: string;
}

export interface AIResult<T> {
  data: T | null;
  error: AIError | null;
}

const OPENAI_API_URL = "https://api.openai.com/v1/responses";

function success<T>(data: T): AIResult<T> {
  return {
    data,
    error: null,
  };
}

function failure<T>(
  code: string,
  message: string,
  retryable: boolean,
  model?: string,
): AIResult<T> {
  return {
    data: null,
    error: {
      code,
      message,
      retryable,
      provider: "openai",
      model,
    },
  };
}

function extractOutputText(response: Record<string, unknown>): string {
  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  const output = response.output;

  if (!Array.isArray(output)) {
    return "";
  }

  const parts: string[] = [];

  for (const item of output) {
    if (!item || typeof item !== "object") continue;

    const itemRecord = item as Record<string, unknown>;
    const content = itemRecord.content;

    if (!Array.isArray(content)) continue;

    for (const contentItem of content) {
      if (!contentItem || typeof contentItem !== "object") continue;

      const contentRecord = contentItem as Record<string, unknown>;

      if (
        contentRecord.type === "output_text" &&
        typeof contentRecord.text === "string"
      ) {
        parts.push(contentRecord.text);
      }
    }
  }

  return parts.join("");
}

function extractUsage(
  response: Record<string, unknown>,
): AIUsage | null {
  const usage = response.usage;

  if (!usage || typeof usage !== "object") {
    return null;
  }

  const usageRecord = usage as Record<string, unknown>;

  const inputTokens =
    typeof usageRecord.input_tokens === "number"
      ? usageRecord.input_tokens
      : null;

  const outputTokens =
    typeof usageRecord.output_tokens === "number"
      ? usageRecord.output_tokens
      : null;

  const totalTokens =
    typeof usageRecord.total_tokens === "number"
      ? usageRecord.total_tokens
      : null;

  return {
    inputTokens,
    outputTokens,
    totalTokens,
  };
}

export async function generateWithOpenAI(
  request: AIRequest,
): Promise<AIResult<AIResponse>> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");

  if (!apiKey) {
    return failure(
      "openai_not_configured",
      "The OpenAI provider is not configured in TJC AI.",
      false,
      request.model,
    );
  }

  const model =
    request.model ||
    Deno.env.get("TJC_AI_OPENAI_MODEL") ||
    "gpt-5";

  const input = request.messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

  const payload: Record<string, unknown> = {
    model,
    input,
  };

  if (request.maxOutputTokens !== undefined) {
    payload.max_output_tokens = request.maxOutputTokens;
  }

  if (request.temperature !== undefined) {
    payload.temperature = request.temperature;
  }

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "The OpenAI provider returned an error.";

    try {
      const errorBody = await response.json();

      if (
        errorBody &&
        typeof errorBody === "object" &&
        "error" in errorBody
      ) {
        const error = (errorBody as Record<string, unknown>).error;

        if (
          error &&
          typeof error === "object" &&
          "message" in error &&
          typeof (error as Record<string, unknown>).message === "string"
        ) {
          message = (error as Record<string, string>).message;
        }
      }
    } catch {
      // Keep the safe generic error message.
    }

    const retryable =
      response.status === 408 ||
      response.status === 409 ||
      response.status === 429 ||
      response.status >= 500;

    return failure(
      "openai_request_failed",
      message,
      retryable,
      model,
    );
  }

  const body = await response.json() as Record<string, unknown>;

  const outputText = extractOutputText(body);

  if (!outputText) {
    return failure(
      "openai_empty_response",
      "OpenAI returned no text content.",
      false,
      model,
    );
  }

  return success({
    message: {
      role: "assistant",
      content: outputText,
    },
    model:
      typeof body.model === "string"
        ? body.model
        : model,
    provider: "openai",
    usage: extractUsage(body),
    requestId:
      typeof body.id === "string"
        ? body.id
        : null,
  });
}

export async function listOpenAIModels(): Promise<
  AIResult<
    Array<{
      id: string;
      label: string;
      provider: string;
      capabilities: string[];
    }>
  >
> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");

  if (!apiKey) {
    return failure(
      "openai_not_configured",
      "The OpenAI provider is not configured in TJC AI.",
      false,
    );
  }

  const response = await fetch(
    "https://api.openai.com/v1/models",
    {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    },
  );

  if (!response.ok) {
    return failure(
      "openai_models_failed",
      "Could not retrieve OpenAI models.",
      response.status >= 500 || response.status === 429,
    );
  }

  const body = await response.json() as Record<string, unknown>;

  const models = Array.isArray(body.data)
    ? body.data
        .filter(
          (item): item is Record<string, unknown> =>
            Boolean(item) &&
            typeof item === "object" &&
            typeof (item as Record<string, unknown>).id === "string",
        )
        .map((item) => ({
          id: item.id as string,
          label: item.id as string,
          provider: "openai",
          capabilities: ["text"],
        }))
    : [];

  return success(models);
}

export async function checkOpenAIHealth(): Promise<
  AIResult<{
    available: boolean;
    message: string | null;
  }>
> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");

  if (!apiKey) {
    return failure(
      "openai_not_configured",
      "The OpenAI provider is not configured in TJC AI.",
      false,
    );
  }

  const response = await fetch(
    "https://api.openai.com/v1/models",
    {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    },
  );

  if (!response.ok) {
    return success({
      available: false,
      message: "OpenAI is not currently available to TJC AI.",
    });
  }

  return success({
    available: true,
    message: null,
  });
}
