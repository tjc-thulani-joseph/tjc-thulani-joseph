import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import type {
  TJCAdapterMessage,
  TJCAdapterRequest,
} from "./adapters/types.ts";

import { getActiveAIAdapter } from "./adapter-registry.ts";
import { retrieveTJCKnowledge } from "./knowledge.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const TJC_AI_SYSTEM_INSTRUCTION = `
You are TJC AI, the intelligence layer inside TJC OS.

Your identity belongs to TJC OS, not to any external AI provider.

External AI engines are replaceable adapters only.
They do not own TJC AI's identity, memory, knowledge,
context, tools, permissions, automation, business data,
or audit history.

When trusted TJC OS knowledge is provided to you,
use it as authoritative TJC OS context when it is relevant to the user's question.

TJC OS knowledge is supplemental context, not a requirement for answering.
For greetings, general questions, explanations, brainstorming, and other requests
that do not require TJC-specific facts, answer normally using your general capabilities.

Do not invent TJC-specific facts when trusted TJC OS knowledge does not support them.
Do not claim that an external AI provider owns TJC AI.

Be accurate, clear, useful, and honest about uncertainty.
`;

interface GatewayRequestBody {
  messages?: unknown;
  model?: unknown;
  maxOutputTokens?: unknown;
  temperature?: unknown;
  metadata?: unknown;
}

function jsonResponse(
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

function isValidMessage(
  message: unknown,
): message is TJCAdapterMessage {
  if (!message || typeof message !== "object") {
    return false;
  }

  const candidate =
    message as Record<string, unknown>;

  return (
    (candidate.role === "user" ||
      candidate.role === "assistant" ||
      candidate.role === "tool") &&
    typeof candidate.content === "string"
  );
}

/**
 * Only query the TJC OS knowledge base when the user's
 * message is actually asking for TJC-specific knowledge.
 *
 * This prevents ordinary/general questions from paying
 * the database retrieval cost on every request.
 */
function shouldRetrieveKnowledge(
  message: string,
): boolean {
  const normalized =
    message
      .toLowerCase()
      .normalize("NFKC");

  const knowledgeSignals = [
    "tjc ai",
    "tjc os",
    "tjc",
    "knowledge base",
    "trusted knowledge",
    "temporary knowledge",
    "verification phrase",
    "policy",
    "policies",
    "business rules",
    "brand guidelines",
    "release schedule",
    "project information",
    "tjc thulani joseph",
  ];

  return knowledgeSignals.some((signal) =>
    normalized.includes(signal)
  );
}

function extractLatestUserMessage(
  messages: TJCAdapterMessage[],
): string {
  for (
    let index = messages.length - 1;
    index >= 0;
    index -= 1
  ) {
    if (messages[index].role === "user") {
      return messages[index].content.trim();
    }
  }

  return "";
}

function buildKnowledgeContext(
  records: Awaited<
    ReturnType<typeof retrieveTJCKnowledge>
  >["data"],
): string {
  if (!records.length) {
    return "";
  }

  const sections = records.map(
    (record, index) => {
      const metadata = [
        record.category
          ? `Category: ${record.category}`
          : null,
        record.tags?.length
          ? `Tags: ${record.tags.join(", ")}`
          : null,
        record.source_type
          ? `Source type: ${record.source_type}`
          : null,
      ]
        .filter(Boolean)
        .join("\n");

      return [
        `Knowledge item ${index + 1}`,
        `Title: ${record.title}`,
        metadata,
        `Content:\n${record.content}`,
      ]
        .filter(Boolean)
        .join("\n");
    },
  );

  return `
TRUSTED TJC OS KNOWLEDGE

The following information was retrieved from the TJC OS
knowledge base for this request.

Use it when relevant to the user's question.
Do not invent facts that are not supported by the
knowledge or the conversation.

${sections.join("\n\n---\n\n")}
`;
}

function buildSystemMessage(
  knowledgeContext: string,
): TJCAdapterMessage {
  return {
    role: "system",
    content: [
      TJC_AI_SYSTEM_INSTRUCTION.trim(),
      knowledgeContext.trim(),
    ]
      .filter(Boolean)
      .join("\n\n"),
  };
}

function createSupabaseClient(
  request: Request,
) {
  const supabaseUrl =
    Deno.env.get("SUPABASE_URL");

  const supabaseAnonKey =
    Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const authorization =
    request.headers.get("Authorization");

  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      global: {
        headers: authorization
          ? {
              Authorization:
                authorization,
            }
          : {},
      },
    },
  );
}

function createStreamResponse(
  stream: AsyncIterable<string>,
  adapterId: string,
): Response {
  const encoder = new TextEncoder();

  const readable =
    new ReadableStream({
      async start(controller) {
        try {
          for await (
            const chunk of stream
          ) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "delta",
                  content: chunk,
                })}\n\n`,
              ),
            );
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "done",
                adapter: adapterId,
              })}\n\n`,
            ),
          );

          controller.close();
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                error: {
                  code:
                    "tjc_ai_stream_failed",
                  message:
                    error instanceof Error
                      ? error.message
                      : "TJC AI streaming failed.",
                  retryable: true,
                  adapter: adapterId,
                },
              })}\n\n`,
            ),
          );

          controller.close();
        }
      },
    });

  return new Response(
    readable,
    {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type":
          "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    },
  );
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return jsonResponse(
      {
        data: null,
        error: {
          code: "method_not_allowed",
          message:
            "Only POST requests are supported.",
          retryable: false,
        },
      },
      405,
    );
  }

  const supabase =
    createSupabaseClient(request);

  if (!supabase) {
    return jsonResponse(
      {
        data: null,
        error: {
          code:
            "supabase_not_configured",
          message:
            "TJC OS backend configuration is incomplete.",
          retryable: false,
        },
      },
      500,
    );
  }

  const accessToken =
    request.headers
      .get("Authorization")
      ?.replace(
        /^Bearer\s+/i,
        "",
      )
      .trim();

  if (!accessToken) {
    return jsonResponse(
      {
        data: null,
        error: {
          code:
            "authentication_required",
          message:
            "A valid TJC OS session is required.",
          retryable: false,
        },
      },
      401,
    );
  }

  const {
    data: userData,
    error: userError,
  } =
    await supabase.auth.getUser(
      accessToken,
    );

  if (
    userError ||
    !userData.user
  ) {
    return jsonResponse(
      {
        data: null,
        error: {
          code:
            "authentication_invalid",
          message:
            "TJC OS could not verify the current session.",
          retryable: false,
        },
      },
      401,
    );
  }

  let body: GatewayRequestBody;

  try {
    body =
      (await request.json()) as GatewayRequestBody;
  } catch {
    return jsonResponse(
      {
        data: null,
        error: {
          code: "invalid_json",
          message:
            "The request body is not valid JSON.",
          retryable: false,
        },
      },
      400,
    );
  }

  if (
    !Array.isArray(body.messages) ||
    body.messages.length === 0
  ) {
    return jsonResponse(
      {
        data: null,
        error: {
          code: "invalid_messages",
          message:
            "At least one message is required.",
          retryable: false,
        },
      },
      400,
    );
  }

  const userMessages =
    body.messages.filter(
      isValidMessage,
    );

  if (
    userMessages.length !==
    body.messages.length
  ) {
    return jsonResponse(
      {
        data: null,
        error: {
          code:
            "invalid_message_format",
          message:
            "One or more messages have an invalid format.",
          retryable: false,
        },
      },
      400,
    );
  }

  const messagesWithoutSystemMessages =
    userMessages.filter(
      (message) =>
        message.role !== "system",
    );

  if (
    messagesWithoutSystemMessages.length ===
    0
  ) {
    return jsonResponse(
      {
        data: null,
        error: {
          code: "invalid_messages",
          message:
            "A user, assistant, or tool message is required.",
          retryable: false,
        },
      },
      400,
    );
  }

  const latestUserMessage =
    extractLatestUserMessage(
      messagesWithoutSystemMessages,
    );

  /*
   * Knowledge is an optional context layer.
   *
   * General questions bypass the database.
   * TJC-specific questions trigger retrieval.
   */
  let knowledgeContext = "";

  if (
    latestUserMessage &&
    shouldRetrieveKnowledge(
      latestUserMessage,
    )
  ) {
    const knowledgeResult =
      await retrieveTJCKnowledge(
        supabase,
        latestUserMessage,
        5,
      );

    if (knowledgeResult.error) {
      console.error(
        "TJC knowledge retrieval failed; continuing without knowledge context:",
        knowledgeResult.error,
      );

      /*
       * Knowledge retrieval failure must never
       * prevent TJC AI from answering a general
       * question.
       */
      knowledgeContext = "";
    } else {
      knowledgeContext =
        buildKnowledgeContext(
          knowledgeResult.data,
        );
    }
  }

  const adapter =
    getActiveAIAdapter();

  if (!adapter) {
    return jsonResponse(
      {
        data: null,
        error: {
          code:
            "adapter_unavailable",
          message:
            "No TJC AI adapter is currently available.",
          retryable: false,
        },
      },
      503,
    );
  }

  const adapterRequest:
    TJCAdapterRequest = {
    messages: [
      buildSystemMessage(
        knowledgeContext,
      ),
      ...messagesWithoutSystemMessages,
    ],

    model:
      typeof body.model === "string"
        ? body.model
        : undefined,

    maxOutputTokens:
      typeof body.maxOutputTokens ===
      "number"
        ? body.maxOutputTokens
        : undefined,

    temperature:
      typeof body.temperature ===
      "number"
        ? body.temperature
        : undefined,

    metadata:
      body.metadata &&
      typeof body.metadata ===
        "object"
        ? (body.metadata as Record<
            string,
            unknown
          >)
        : undefined,
  };

  const wantsStreaming =
    request.headers
      .get("Accept")
      ?.includes(
        "text/event-stream",
      ) ?? false;

  if (
    wantsStreaming &&
    adapter.generateStream
  ) {
    const streamResult =
      await adapter.generateStream(
        adapterRequest,
      );

    if (streamResult.error) {
      return jsonResponse(
        {
          data: null,
          error:
            streamResult.error,
        },
        streamResult.error
          .retryable
          ? 503
          : 400,
      );
    }

    if (!streamResult.data) {
      return jsonResponse(
        {
          data: null,
          error: {
            code:
              "empty_stream",
            message:
              "TJC AI returned no streaming response.",
            retryable: true,
            adapter:
              adapter.id,
          },
        },
        502,
      );
    }

    return createStreamResponse(
      streamResult.data.stream,
      adapter.id,
    );
  }

  const result =
    await adapter.generate(
      adapterRequest,
    );

  if (result.error) {
    return jsonResponse(
      {
        data: null,
        error: result.error,
      },
      result.error.retryable
        ? 503
        : 400,
    );
  }

  return jsonResponse({
    data: result.data,
    error: null,
  });
});
