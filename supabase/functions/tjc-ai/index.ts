/**
 * TJC AI Secure Gateway
 *
 * This is the server-side boundary between TJC OS and TJC AI providers.
 *
 * IMPORTANT:
 * - Provider API keys must never exist in browser code.
 * - Provider SDKs must never be imported by the public frontend.
 * - Provider-specific logic belongs behind the TJC AI adapter layer.
 * - This gateway requires an authenticated TJC OS user.
 *
 * 7A.4 establishes the secure gateway.
 * Provider execution is added in later AI foundation steps.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AIMessageRole =
  | "system"
  | "user"
  | "assistant"
  | "tool";

interface AIMessage {
  role: AIMessageRole;
  content: string;
}

interface AIRequest {
  messages: AIMessage[];
  model?: string;
  maxOutputTokens?: number;
  temperature?: number;
  metadata?: Record<string, unknown>;
}

interface AIError {
  code: string;
  message: string;
  retryable: boolean;
}

interface AIResponse {
  data: null;
  error: AIError;
}

function json(
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function isValidMessage(value: unknown): value is AIMessage {
  if (!value || typeof value !== "object") return false;

  const message = value as Record<string, unknown>;

  return (
    typeof message.role === "string" &&
    ["system", "user", "assistant", "tool"].includes(message.role) &&
    typeof message.content === "string"
  );
}

function isValidAIRequest(value: unknown): value is AIRequest {
  if (!value || typeof value !== "object") return false;

  const request = value as Record<string, unknown>;

  if (!Array.isArray(request.messages)) return false;

  if (!request.messages.every(isValidMessage)) return false;

  if (
    request.model !== undefined &&
    typeof request.model !== "string"
  ) {
    return false;
  }

  if (
    request.maxOutputTokens !== undefined &&
    (
      typeof request.maxOutputTokens !== "number" ||
      !Number.isFinite(request.maxOutputTokens) ||
      request.maxOutputTokens <= 0
    )
  ) {
    return false;
  }

  if (
    request.temperature !== undefined &&
    (
      typeof request.temperature !== "number" ||
      !Number.isFinite(request.temperature)
    )
  ) {
    return false;
  }

  return true;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return json(
      {
        data: null,
        error: {
          code: "method_not_allowed",
          message: "TJC AI gateway accepts POST requests only.",
          retryable: false,
        },
      },
      405,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    return json(
      {
        data: null,
        error: {
          code: "gateway_not_configured",
          message: "TJC AI gateway is not configured.",
          retryable: false,
        },
      },
      500,
    );
  }

  const authorization = request.headers.get("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return json(
      {
        data: null,
        error: {
          code: "authentication_required",
          message: "A valid TJC OS session is required.",
          retryable: false,
        },
      },
      401,
    );
  }

  const accessToken = authorization.slice("Bearer ".length).trim();

  if (!accessToken) {
    return json(
      {
        data: null,
        error: {
          code: "authentication_required",
          message: "A valid TJC OS session is required.",
          retryable: false,
        },
      },
      401,
    );
  }

  const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  const {
    data: userData,
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !userData.user) {
    return json(
      {
        data: null,
        error: {
          code: "authentication_invalid",
          message: "The TJC OS session is invalid or expired.",
          retryable: false,
        },
      },
      401,
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return json(
      {
        data: null,
        error: {
          code: "invalid_json",
          message: "The AI request body must contain valid JSON.",
          retryable: false,
        },
      },
      400,
    );
  }

  if (!isValidAIRequest(body)) {
    return json(
      {
        data: null,
        error: {
          code: "invalid_ai_request",
          message: "The request does not match the TJC AI request contract.",
          retryable: false,
        },
      },
      400,
    );
  }

  /*
   * 7A.4 intentionally stops here.
   *
   * The request has:
   * - reached the secure server boundary
   * - passed authentication
   * - passed contract validation
   *
   * Provider execution will be connected through the TJC AI
   * provider adapter system in the following steps.
   */

  return json(
    {
      data: null,
      error: {
        code: "ai_provider_not_connected",
        message:
          "TJC AI gateway is online, but no AI provider adapter is connected yet.",
        retryable: false,
      },
    },
    503,
  );
});
