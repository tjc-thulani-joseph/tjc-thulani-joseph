import {
  FunctionsHttpError,
} from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

import type {
  AIMessage,
  AIResponse,
  AIResult,
  AIStreamEvent,
} from "./types";

/**
 * Send a normal request through TJC AI.
 *
 * The browser talks only to TJC AI.
 * It never talks directly to Gemini or another external engine.
 */
export async function requestTjcAi(
  messages: AIMessage[],
  options?: {
    maxOutputTokens?: number;
    temperature?: number;
  },
): Promise<AIResult<AIResponse>> {
  if (!supabase) {
    return {
      data: null,
      error: {
        code: "supabase_not_configured",
        message:
          "TJC OS is not connected to its backend.",
        retryable: false,
      },
    };
  }

  const { data, error } =
    await supabase.functions.invoke("tjc-ai", {
      body: {
        messages,
        maxOutputTokens:
          options?.maxOutputTokens ?? 1024,
        temperature:
          options?.temperature ?? 0.7,
      },
    });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const gatewayResult =
          (await error.context.json()) as AIResult<AIResponse>;

        if (gatewayResult?.error) {
          return gatewayResult;
        }
      } catch {
        // Fall through to the safe generic error.
      }
    }

    return {
      data: null,
      error: {
        code: "tjc_ai_gateway_failed",
        message:
          error.message ||
          "TJC AI could not reach its intelligence gateway.",
        retryable: true,
      },
    };
  }

  if (!data) {
    return {
      data: null,
      error: {
        code: "tjc_ai_empty_response",
        message: "TJC AI returned no response.",
        retryable: false,
      },
    };
  }

  const result =
    data as AIResult<AIResponse>;

  if (result.error) {
    return result;
  }

  return result;
}

/**
 * Stream a response through TJC AI.
 *
 * The browser receives only TJC AI stream events.
 * Provider-specific streaming formats stay inside
 * the server-side TJC AI gateway and engine adapter.
 */
export async function streamTjcAi(
  messages: AIMessage[],
  options?: {
    maxOutputTokens?: number;
    temperature?: number;
    onEvent?: (
      event: AIStreamEvent,
    ) => void;
  },
): Promise<AIResult<null>> {
  if (!supabase) {
    return {
      data: null,
      error: {
        code: "supabase_not_configured",
        message:
          "TJC OS is not connected to its backend.",
        retryable: false,
      },
    };
  }

  const {
    data: sessionData,
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    return {
      data: null,
      error: {
        code: "tjc_ai_session_failed",
        message:
          "TJC AI could not verify the current TJC OS session.",
        retryable: true,
      },
    };
  }

  const accessToken =
    sessionData.session?.access_token;

  if (!accessToken) {
    return {
      data: null,
      error: {
        code: "authentication_required",
        message:
          "A valid TJC OS session is required.",
        retryable: false,
      },
    };
  }

  const supabaseUrl =
    (import.meta.env[
      "VITE_SUPABASE_URL"
    ] as string | undefined)?.trim();

  const supabaseAnonKey =
    (import.meta.env[
      "VITE_SUPABASE_ANON_KEY"
    ] as string | undefined)?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      data: null,
      error: {
        code: "supabase_not_configured",
        message:
          "TJC OS is not connected to its backend.",
        retryable: false,
      },
    };
  }

  let response: Response;

  try {
    response = await fetch(
      `${supabaseUrl}/functions/v1/tjc-ai`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: supabaseAnonKey,
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          messages,
          maxOutputTokens:
            options?.maxOutputTokens ?? 1024,
          temperature:
            options?.temperature ?? 0.7,
        }),
      },
    );
  } catch {
    return {
      data: null,
      error: {
        code: "tjc_ai_stream_network_failed",
        message:
          "TJC AI could not reach its streaming gateway.",
        retryable: true,
      },
    };
  }

  if (!response.ok) {
    try {
      const body =
        (await response.json()) as AIResult<null>;

      if (body?.error) {
        return body;
      }
    } catch {
      // Fall through to safe generic error.
    }

    return {
      data: null,
      error: {
        code: "tjc_ai_stream_failed",
        message:
          "TJC AI could not start the streaming response.",
        retryable: response.status >= 500,
      },
    };
  }

  if (!response.body) {
    return {
      data: null,
      error: {
        code: "tjc_ai_stream_empty",
        message:
          "TJC AI returned no streaming response.",
        retryable: true,
      },
    };
  }

  const reader =
    response.body.getReader();

  const decoder = new TextDecoder();

  let buffer = "";

  try {
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
        { stream: true },
      );

      const events =
        buffer.split(
          /\r?\n\r?\n/,
        );

      buffer =
        events.pop() ?? "";

      for (const event of events) {
        const dataLines =
          event
            .split(/\r?\n/)
            .filter((line) =>
              line.startsWith("data:"),
            )
            .map((line) =>
              line.slice(5).trim(),
            )
            .filter(Boolean);

        if (!dataLines.length) {
          continue;
        }

        const data =
          dataLines.join("\n");

        let parsed:
          | AIStreamEvent
          | null = null;

        try {
          parsed =
            JSON.parse(data) as AIStreamEvent;
        } catch {
          continue;
        }

        if (
          parsed.type === "delta"
        ) {
          options?.onEvent?.(parsed);
          continue;
        }

        if (
          parsed.type === "done"
        ) {
          options?.onEvent?.(parsed);
          continue;
        }

        if (
          parsed.type === "error"
        ) {
          options?.onEvent?.(parsed);

          return {
            data: null,
            error: parsed.error,
          };
        }
      }
    }
  } catch {
    return {
      data: null,
      error: {
        code: "tjc_ai_stream_read_failed",
        message:
          "TJC AI's streaming response was interrupted.",
        retryable: true,
      },
    };
  } finally {
    reader.releaseLock();
  }

  return {
    data: null,
    error: null,
  };
}
