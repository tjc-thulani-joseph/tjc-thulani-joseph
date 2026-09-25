import { supabase } from "@/lib/supabase";
import type {
  AIMessage,
  AIResponse,
  AIResult,
} from "./types";

/**
 * Send a request through the TJC AI gateway.
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
        message: "TJC OS is not connected to its backend.",
        retryable: false,
      },
    };
  }

  const { data, error } = await supabase.functions.invoke("tjc-ai", {
    body: {
      messages,
      maxOutputTokens: options?.maxOutputTokens ?? 1024,
      temperature: options?.temperature ?? 0.7,
    },
  });

  if (error) {
    return {
      data: null,
      error: {
        code: "tjc_ai_gateway_failed",
        message: "TJC AI could not reach its intelligence gateway.",
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

  return data as AIResult<AIResponse>;
}
