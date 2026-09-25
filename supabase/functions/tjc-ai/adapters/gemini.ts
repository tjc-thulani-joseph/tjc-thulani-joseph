import type {
  TJCAdapter,
  TJCAdapterError,
  TJCAdapterRequest,
  TJCAdapterResult,
  TJCAdapterResponse,
} from "./types.ts";

const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta";

const DEFAULT_MODEL = "gemini-3.5-flash-lite";

function getApiKey(): string | null {
  return Deno.env.get("GEMINI_API_KEY")?.trim() || null;
}

function getDefaultModel(): string {
  return (
    Deno.env.get("TJC_AI_GEMINI_MODEL")?.trim() ||
    DEFAULT_MODEL
  );
}

function adapterError(
  code: string,
  message: string,
  retryable = false,
  model?: string,
): TJCAdapterError {
  return {
    code,
    message,
    retryable,
    adapter: "gemini",
    model,
  };
}

function errorResult<T>(
  code: string,
  message: string,
  retryable = false,
  model?: string,
): TJCAdapterResult<T> {
  return {
    data: null,
    error: adapterError(
      code,
      message,
      retryable,
      model,
    ),
  };
}

function buildContents(
  request: TJCAdapterRequest,
) {
  const contents = [];

  for (const message of request.messages) {
    if (message.role === "system") {
      continue;
    }

    if (message.role === "tool") {
      return null;
    }

    contents.push({
      role:
        message.role === "assistant"
          ? "model"
          : "user",
      parts: [
        {
          text: message.content,
        },
      ],
    });
  }

  return contents;
}

function getSystemInstruction(
  request: TJCAdapterRequest,
): string | null {
  const systemMessages = request.messages
    .filter(
      (message) =>
        message.role === "system",
    )
    .map((message) =>
      message.content.trim(),
    )
    .filter(Boolean);

  return systemMessages.length
    ? systemMessages.join("\n\n")
    : null;
}

function buildPayload(
  request: TJCAdapterRequest,
): Record<string, unknown> | null {
  const contents = buildContents(request);

  if (!contents || contents.length === 0) {
    return null;
  }

  const payload: Record<
    string,
    unknown
  > = {
    contents,
  };

  const systemInstruction =
    getSystemInstruction(request);

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [
        {
          text: systemInstruction,
        },
      ],
    };
  }

  const generationConfig: Record<
    string,
    unknown
  > = {};

  if (
    request.maxOutputTokens !==
    undefined
  ) {
    generationConfig.maxOutputTokens =
      Math.floor(
        request.maxOutputTokens,
      );
  }

  if (
    request.temperature !==
    undefined
  ) {
    generationConfig.temperature =
      request.temperature;
  }

  if (
    Object.keys(generationConfig)
      .length > 0
  ) {
    payload.generationConfig =
      generationConfig;
  }

  return payload;
}

function extractText(
  body: unknown,
): string {
  const value =
    body as Record<
      string,
      any
    > | null;

  const parts =
    value?.candidates?.[0]
      ?.content?.parts;

  if (!Array.isArray(parts)) {
    return "";
  }

  return parts
    .filter(
      (part: any) =>
        typeof part?.text ===
        "string",
    )
    .map(
      (part: any) =>
        part.text,
    )
    .join("");
}

async function* parseGeminiSse(
  response: Response,
): AsyncIterable<string> {
  if (!response.body) {
    throw new Error(
      "Gemini returned no streaming body.",
    );
  }

  const reader =
    response.body.getReader();

  const decoder =
    new TextDecoder();

  let buffer = "";

  while (true) {
    const {
      value,
      done,
    } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(
      value,
      {
        stream: true,
      },
    );

    const events =
      buffer.split(
        /\r?\n\r?\n/,
      );

    buffer =
      events.pop() ?? "";

    for (
      const event of events
    ) {
      const dataLines =
        event
          .split(/\r?\n/)
          .filter((line) =>
            line.startsWith(
              "data:",
            ),
          )
          .map((line) =>
            line
              .slice(5)
              .trim(),
          )
          .filter(Boolean);

      if (
        dataLines.length ===
        0
      ) {
        continue;
      }

      const data =
        dataLines.join("\n");

      if (
        data === "[DONE]"
      ) {
        return;
      }

      try {
        const body =
          JSON.parse(data);

        const text =
          extractText(body);

        if (text) {
          yield text;
        }
      } catch {
        // Ignore incomplete SSE events.
      }
    }
  }

  buffer += decoder.decode();

  if (buffer.trim()) {
    const dataLines =
      buffer
        .split(/\r?\n/)
        .filter((line) =>
          line.startsWith(
            "data:",
          ),
        )
        .map((line) =>
          line
            .slice(5)
            .trim(),
        )
        .filter(Boolean);

    if (dataLines.length) {
      try {
        const body =
          JSON.parse(
            dataLines.join(
              "\n",
            ),
          );

        const text =
          extractText(body);

        if (text) {
          yield text;
        }
      } catch {
        // Ignore incomplete final event.
      }
    }
  }
}

const geminiAdapter: TJCAdapter =
  {
    id: "gemini",

    label: "Google Gemini",

    async generate(
      request,
    ): Promise<
      TJCAdapterResult<
        TJCAdapterResponse
      >
    > {
      const apiKey =
        getApiKey();

      if (!apiKey) {
        return errorResult(
          "adapter_not_configured",
          "The Gemini adapter is not configured.",
        );
      }

      const model =
        request.model?.trim() ||
        getDefaultModel();

      const payload =
        buildPayload(
          request,
        );

      if (!payload) {
        return errorResult(
          "invalid_ai_request",
          "TJC AI requires at least one user or assistant message.",
          false,
          model,
        );
      }

      const response =
        await fetch(
          `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              "x-goog-api-key":
                apiKey,
            },
            body: JSON.stringify(
              payload,
            ),
          },
        );

      if (!response.ok) {
        let message =
          "The Gemini adapter could not complete the request.";

        try {
          const body =
            await response.json();

          if (
            typeof body
              ?.error
              ?.message ===
              "string" &&
            body.error.message.trim()
          ) {
            message =
              body.error.message;
          }
        } catch {
          // Ignore error parsing failure.
        }

        return errorResult(
          response.status === 429
            ? "adapter_rate_limited"
            : "adapter_request_failed",
          message,
          response.status ===
            429 ||
            response.status >=
              500,
          model,
        );
      }

      const body =
        await response.json();

      const text =
        extractText(body);

      if (!text.trim()) {
        return errorResult(
          "empty_adapter_response",
          "TJC AI received no usable response from the Gemini adapter.",
          false,
          model,
        );
      }

      const usage =
        body?.usageMetadata;

      return {
        data: {
          message: {
            role: "assistant",
            content: text,
          },

          model:
            body?.modelVersion ??
            model,

          adapter: "gemini",

          usage: {
            inputTokens:
              typeof usage
                ?.promptTokenCount ===
              "number"
                ? usage.promptTokenCount
                : null,

            outputTokens:
              typeof usage
                ?.candidatesTokenCount ===
              "number"
                ? usage.candidatesTokenCount
                : null,

            totalTokens:
              typeof usage
                ?.totalTokenCount ===
              "number"
                ? usage.totalTokenCount
                : null,
          },

          requestId:
            typeof body
              ?.responseId ===
            "string"
              ? body.responseId
              : null,
        },

        error: null,
      };
    },

    async generateStream(
      request,
    ) {
      const apiKey =
        getApiKey();

      if (!apiKey) {
        return errorResult<{
          stream: AsyncIterable<string>;
        }>(
          "adapter_not_configured",
          "The Gemini adapter is not configured.",
        );
      }

      const model =
        request.model?.trim() ||
        getDefaultModel();

      const payload =
        buildPayload(
          request,
        );

      if (!payload) {
        return errorResult<{
          stream: AsyncIterable<string>;
        }>(
          "invalid_ai_request",
          "TJC AI requires at least one user or assistant message.",
          false,
          model,
        );
      }

      const response =
        await fetch(
          `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              "x-goog-api-key":
                apiKey,
            },
            body: JSON.stringify(
              payload,
            ),
          },
        );

      if (!response.ok) {
        let message =
          "The Gemini adapter could not start the streaming response.";

        try {
          const body =
            await response.json();

          if (
            typeof body
              ?.error
              ?.message ===
              "string" &&
            body.error.message.trim()
          ) {
            message =
              body.error.message;
          }
        } catch {
          // Ignore error parsing failure.
        }

        return errorResult<{
          stream: AsyncIterable<string>;
        }>(
          response.status === 429
            ? "adapter_rate_limited"
            : "adapter_stream_failed",
          message,
          response.status ===
            429 ||
            response.status >=
              500,
          model,
        );
      }

      return {
        data: {
          stream:
            parseGeminiSse(
              response,
            ),
        },
        error: null,
      };
    },

    async listModels() {
      const apiKey =
        getApiKey();

      if (!apiKey) {
        return errorResult<
          Array<{
            id: string;
            label: string;
            capabilities: string[];
          }>
        >(
          "adapter_not_configured",
          "The Gemini adapter is not configured.",
        );
      }

      const response =
        await fetch(
          `${GEMINI_API_BASE}/models?pageSize=100`,
          {
            headers: {
              "x-goog-api-key":
                apiKey,
            },
          },
        );

      if (!response.ok) {
        return errorResult<
          Array<{
            id: string;
            label: string;
            capabilities: string[];
          }>
        >(
          "adapter_models_failed",
          "TJC AI could not retrieve the Gemini models.",
          response.status >=
            500,
        );
      }

      const body =
        await response.json();

      const models =
        Array.isArray(
          body?.models,
        )
          ? body.models
              .filter(
                (model: any) =>
                  Array.isArray(
                    model?.supportedGenerationMethods,
                  ) &&
                  model.supportedGenerationMethods.includes(
                    "generateContent",
                  ),
              )
              .map(
                (model: any) => ({
                  id:
                    model.baseModelId ??
                    model.name?.replace(
                      /^models\//,
                      "",
                    ) ??
                    "unknown",

                  label:
                    model.displayName ??
                    model.baseModelId ??
                    "Unknown model",

                  capabilities: [
                    "text",
                  ],
                }),
              )
          : [];

      return {
        data: models,
        error: null,
      };
    },

    async health() {
      const apiKey =
        getApiKey();

      if (!apiKey) {
        return errorResult<{
          available: boolean;
          message: string | null;
        }>(
          "adapter_not_configured",
          "The Gemini adapter is not configured.",
        );
      }

      const model =
        getDefaultModel();

      const response =
        await fetch(
          `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}`,
          {
            headers: {
              "x-goog-api-key":
                apiKey,
            },
          },
        );

      if (!response.ok) {
        return errorResult<{
          available: boolean;
          message: string | null;
        }>(
          "adapter_health_failed",
          "The Gemini adapter is not currently available.",
          response.status >=
            500,
          model,
        );
      }

      return {
        data: {
          available: true,
          message:
            "Gemini adapter is available.",
        },
        error: null,
      };
    },
  };

export default geminiAdapter;
