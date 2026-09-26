import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import type {
  TJCAdapterMessage,
  TJCAdapterRequest,
  TJCAdapterResponse,
  TJCAdapterToolCall,
  TJCAdapterToolResult,
} from "./adapters/types.ts";

import { getActiveAIAdapter } from "./adapter-registry.ts";
import { retrieveTJCKnowledge } from "./knowledge.ts";

import {
  executeTJCTool,
  getAvailableTJCTools,
  type TJCRole,
  type TJCToolContext,
} from "./tools.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const MAX_TOOL_ROUNDS = 4;

const TJC_AI_SYSTEM_INSTRUCTION = `
You are TJC AI, the intelligence layer inside TJC OS.

Your identity belongs to TJC OS, not to any external AI provider.

External AI engines are replaceable adapters only.
They do not own TJC AI's identity, memory, knowledge,
context, tools, permissions, automation, business data,
or audit history.

When trusted TJC OS knowledge is provided to you,
use it as authoritative TJC OS context when it is relevant
to the user's question.

TJC OS knowledge is supplemental context, not a requirement
for answering.

For greetings, general questions, explanations,
brainstorming, and other requests that do not require
TJC-specific facts, answer normally using your general
capabilities.

Do not invent TJC-specific facts when trusted TJC OS
knowledge does not support them.

Do not claim that an external AI provider owns TJC AI.

When TJC OS tools are available, they are controlled
by TJC OS. You may request a tool when it is genuinely
useful, but the tool is never executed directly by you.

Tool execution is subject to TJC OS authentication,
authorization, validation, and audit controls.

Do not claim that an action was completed unless TJC OS
actually returned a successful tool result.

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
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: corsHeaders,
    },
  );
}

function isValidMessage(
  message: unknown,
): message is TJCAdapterMessage {
  if (
    !message ||
    typeof message !== "object"
  ) {
    return false;
  }

  const candidate =
    message as Record<
      string,
      unknown
    >;

  return (
    (
      candidate.role ===
        "user" ||
      candidate.role ===
        "assistant" ||
      candidate.role ===
        "tool"
    ) &&
    typeof candidate.content ===
      "string"
  );
}

/**
 * Only query the TJC OS knowledge base when the
 * user's message is actually asking for
 * TJC-specific knowledge.
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

  return knowledgeSignals.some(
    (signal) =>
      normalized.includes(
        signal,
      ),
  );
}

function extractLatestUserMessage(
  messages: TJCAdapterMessage[],
): string {
  for (
    let index =
      messages.length - 1;
    index >= 0;
    index -= 1
  ) {
    if (
      messages[index].role ===
      "user"
    ) {
      return messages[
        index
      ].content.trim();
    }
  }

  return "";
}

function buildKnowledgeContext(
  records: Awaited<
    ReturnType<
      typeof retrieveTJCKnowledge
    >
  >["data"],
): string {
  if (!records.length) {
    return "";
  }

  const sections =
    records.map(
      (
        record,
        index,
      ) => {
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
    Deno.env.get(
      "SUPABASE_URL",
    );

  const supabaseAnonKey =
    Deno.env.get(
      "SUPABASE_ANON_KEY",
    );

  if (
    !supabaseUrl ||
    !supabaseAnonKey
  ) {
    return null;
  }

  const authorization =
    request.headers.get(
      "Authorization",
    );

  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      global: {
        headers:
          authorization
            ? {
                Authorization:
                  authorization,
              }
            : {},
      },
    },
  );
}

/**
 * Load roles from Supabase.
 *
 * The browser and Gemini never supply these roles.
 * They come from the authenticated user's database
 * records.
 */
async function loadUserRoles(
  supabase: ReturnType<
    typeof createSupabaseClient
  >,
  userId: string,
): Promise<TJCRole[]> {
  if (!supabase) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from("user_roles")
    .select("role")
    .eq(
      "user_id",
      userId,
    );

  if (error) {
    console.error(
      "TJC AI role lookup failed:",
      error.message,
    );

    /**
     * Fail closed.
     *
     * If role information cannot be verified,
     * no privileged tools will be exposed.
     */
    return [];
  }

  const validRoles: TJCRole[] = [
    "ceo",
    "admin",
    "editor",
    "team",
    "visitor",
  ];

  return [
    ...new Set(
      (data ?? [])
        .map(
          (row) =>
            row.role,
        )
        .filter(
          (
            role,
          ): role is TJCRole =>
            validRoles.includes(
              role as TJCRole,
            ),
        ),
    ),
  ];
}

/**
 * Preserve the existing streaming response
 * contract used by the TJC AI frontend.
 */
function createStreamResponse(
  stream: AsyncIterable<string>,
  adapterId: string,
): Response {
  const encoder =
    new TextEncoder();

  const readable =
    new ReadableStream({
      async start(
        controller,
      ) {
        try {
          for await (
            const chunk of stream
          ) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "delta",
                  content:
                    chunk,
                })}\n\n`,
              ),
            );
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "done",
                adapter:
                  adapterId,
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
                    error instanceof
                    Error
                      ? error.message
                      : "TJC AI streaming failed.",

                  retryable:
                    true,

                  adapter:
                    adapterId,
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

        "Cache-Control":
          "no-cache",

        Connection:
          "keep-alive",
      },
    },
  );
}

/**
 * When tools are required, the final response
 * is still returned through the same SSE shape
 * expected by the existing frontend.
 *
 * The tool orchestration itself happens before
 * this response is created.
 */
function createFinalTextStreamResponse(
  content: string,
  adapterId: string,
): Response {
  const encoder =
    new TextEncoder();

  const readable =
    new ReadableStream({
      start(
        controller,
      ) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "delta",
              content,
            })}\n\n`,
          ),
        );

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "done",
              adapter:
                adapterId,
            })}\n\n`,
          ),
        );

        controller.close();
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

        "Cache-Control":
          "no-cache",

        Connection:
          "keep-alive",
      },
    },
  );
}

function isToolResultResponse(
  result:
    | TJCAdapterResponse
    | null,
): result is TJCAdapterResponse {
  return (
    result !== null &&
    Array.isArray(
      result.toolCalls,
    )
  );
}

/**
 * Execute the TJC AI tool loop.
 *
 * Flow:
 *
 * TJC AI
 *   ↓
 * Gemini
 *   ↓
 * function call
 *   ↓
 * TJC Tool Registry
 *   ↓
 * permission
 *   ↓
 * validation
 *   ↓
 * executor
 *   ↓
 * audit
 *   ↓
 * tool result
 *   ↓
 * Gemini
 *   ↓
 * final answer
 *
 * The loop is bounded so the model can never
 * create an uncontrolled chain of tool calls.
 */
async function generateWithTools(
  adapter: NonNullable<
    ReturnType<
      typeof getActiveAIAdapter
    >
  >,
  baseRequest: TJCAdapterRequest,
  toolContext: TJCToolContext,
): Promise<
  {
    data:
      | TJCAdapterResponse
      | null;

    error:
      | {
          code: string;
          message: string;
          retryable: boolean;
          adapter?: string;
          model?: string;
        }
      | null;
  }
> {
  const availableTools =
    getAvailableTJCTools(
      toolContext,
    );

  /**
   * If the authenticated user has no permitted
   * tools, use the normal adapter path.
   */
  if (
    availableTools.length ===
    0
  ) {
    return adapter.generate(
      baseRequest,
    );
  }

  let toolCalls:
    TJCAdapterToolCall[] =
    [];

  let toolResults:
    TJCAdapterToolResult[] =
    [];

  let latestResult:
    TJCAdapterResponse | null =
    null;

  for (
    let round = 0;
    round < MAX_TOOL_ROUNDS;
    round += 1
  ) {
    const request: TJCAdapterRequest =
      {
        ...baseRequest,

        tools:
          availableTools,

        toolCalls:
          toolCalls.length > 0
            ? toolCalls
            : undefined,

        toolResults:
          toolResults.length > 0
            ? toolResults
            : undefined,
      };

    const result =
      await adapter.generate(
        request,
      );

    if (result.error) {
      return {
        data: null,
        error:
          result.error,
      };
    }

    if (!result.data) {
      return {
        data: null,

        error: {
          code:
            "empty_adapter_response",

          message:
            "TJC AI received no response while processing its tool request.",

          retryable:
            true,

          adapter:
            adapter.id,
        },
      };
    }

    latestResult =
      result.data;

    /**
     * No tool call means Gemini has produced
     * its final answer.
     */
    if (
      !result.data.toolCalls ||
      result.data.toolCalls.length ===
        0
    ) {
      return {
        data:
          result.data,

        error: null,
      };
    }

    /**
     * Execute all tool calls returned in this
     * round.
     *
     * The current first tool is read-only.
     * Future tools may add more restrictive
     * execution policies individually.
     */
    const executionResults =
      await Promise.all(
        result.data.toolCalls.map(
          (toolCall) =>
            executeTJCTool(
              toolCall,
              toolContext,
            ),
        ),
      );

    /**
     * Preserve every call and result so the
     * provider can reason over the complete
     * orchestration turn.
     */
    toolCalls =
      result.data.toolCalls;

    toolResults =
      executionResults.map(
        (execution) =>
          execution.toolCall,
      );
  }

  /**
   * Never silently allow an infinite tool loop.
   */
  return {
    data: null,

    error: {
      code:
        "tool_execution_limit_reached",

      message:
        `TJC AI reached the maximum of ${MAX_TOOL_ROUNDS} tool-processing rounds without producing a final response.`,

      retryable:
        false,

      adapter:
        adapter.id,
    },
  };
}

Deno.serve(
  async (request) => {
    if (
      request.method ===
      "OPTIONS"
    ) {
      return new Response(
        "ok",
        {
          headers:
            corsHeaders,
        },
      );
    }

    if (
      request.method !==
      "POST"
    ) {
      return jsonResponse(
        {
          data: null,

          error: {
            code:
              "method_not_allowed",

            message:
              "Only POST requests are supported.",

            retryable:
              false,
          },
        },

        405,
      );
    }

    const supabase =
      createSupabaseClient(
        request,
      );

    if (!supabase) {
      return jsonResponse(
        {
          data: null,

          error: {
            code:
              "supabase_not_configured",

            message:
              "TJC OS backend configuration is incomplete.",

            retryable:
              false,
          },
        },

        500,
      );
    }

    const accessToken =
      request.headers
        .get(
          "Authorization",
        )
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

            retryable:
              false,
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

            retryable:
              false,
          },
        },

        401,
      );
    }

    let body:
      GatewayRequestBody;

    try {
      body =
        (await request.json()) as GatewayRequestBody;
    } catch {
      return jsonResponse(
        {
          data: null,

          error: {
            code:
              "invalid_json",

            message:
              "The request body is not valid JSON.",

            retryable:
              false,
          },
        },

        400,
      );
    }

    if (
      !Array.isArray(
        body.messages,
      ) ||
      body.messages.length ===
        0
    ) {
      return jsonResponse(
        {
          data: null,

          error: {
            code:
              "invalid_messages",

            message:
              "At least one message is required.",

            retryable:
              false,
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

            retryable:
              false,
          },
        },

        400,
      );
    }

    const messagesWithoutSystemMessages =
      userMessages.filter(
        (message) =>
          message.role !==
          "system",
      );

    if (
      messagesWithoutSystemMessages.length ===
      0
    ) {
      return jsonResponse(
        {
          data: null,

          error: {
            code:
              "invalid_messages",

            message:
              "A user, assistant, or tool message is required.",

            retryable:
              false,
          },
        },

        400,
      );
    }

    const latestUserMessage =
      extractLatestUserMessage(
        messagesWithoutSystemMessages,
      );

    /**
     * Knowledge is an optional context layer.
     *
     * General questions bypass the database.
     * TJC-specific questions trigger retrieval.
     */
    let knowledgeContext =
      "";

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

      if (
        knowledgeResult.error
      ) {
        console.error(
          "TJC knowledge retrieval failed; continuing without knowledge context:",
          knowledgeResult.error,
        );

        knowledgeContext =
          "";
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

            retryable:
              false,
          },
        },

        503,
      );
    }

    /**
     * Load roles directly from the authenticated
     * user's Supabase records.
     *
     * Failure results in an empty role set,
     * which fails closed for privileged tools.
     */
    const userRoles =
      await loadUserRoles(
        supabase,
        userData.user.id,
      );

    const toolContext:
      TJCToolContext = {
      supabase,

      userId:
        userData.user.id,

      roles:
        userRoles,

      adapterId:
        adapter.id,
    };

    const availableTools =
      getAvailableTJCTools(
        toolContext,
      );

    const adapterRequest:
      TJCAdapterRequest = {
      messages: [
        buildSystemMessage(
          knowledgeContext,
        ),

        ...messagesWithoutSystemMessages,
      ],

      model:
        typeof body.model ===
        "string"
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
        ) ??
      false;

    /**
     * If tools are available, use the complete
     * orchestration path.
     *
     * This is important because the current
     * Gemini streaming adapter deliberately does
     * not flatten structured tool calls into text.
     */
    if (
      availableTools.length >
      0
    ) {
      const result =
        await generateWithTools(
          adapter,
          adapterRequest,
          toolContext,
        );

      if (result.error) {
        return jsonResponse(
          {
            data: null,

            error:
              result.error,
          },

          result.error.retryable
            ? 503
            : 400,
        );
      }

      if (!result.data) {
        return jsonResponse(
          {
            data: null,

            error: {
              code:
                "empty_tool_response",

              message:
                "TJC AI completed tool processing but returned no final response.",

              retryable:
                true,

              adapter:
                adapter.id,
            },
          },

          502,
        );
      }

      /**
       * The frontend already expects SSE.
       *
       * Therefore, when tools were used, return
       * the completed answer through the same
       * SSE envelope.
       *
       * The answer is delivered as one final
       * delta rather than exposing intermediate
       * tool execution details to the browser.
       */
      if (
        wantsStreaming
      ) {
        return createFinalTextStreamResponse(
          result.data.message
            .content,
          adapter.id,
        );
      }

      return jsonResponse({
        data:
          result.data,

        error:
          null,
      });
    }

    /**
     * No tools are available for this user.
     *
     * Preserve the existing streaming path.
     */
    if (
      wantsStreaming &&
      adapter.generateStream
    ) {
      const streamResult =
        await adapter.generateStream(
          adapterRequest,
        );

      if (
        streamResult.error
      ) {
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

      if (
        !streamResult.data
      ) {
        return jsonResponse(
          {
            data: null,

            error: {
              code:
                "empty_stream",

              message:
                "TJC AI returned no streaming response.",

              retryable:
                true,

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

    /**
     * Normal non-streaming generation.
     */
    const result =
      await adapter.generate(
        adapterRequest,
      );

    if (result.error) {
      return jsonResponse(
        {
          data: null,

          error:
            result.error,
        },

        result.error.retryable
          ? 503
          : 400,
      );
    }

    return jsonResponse({
      data:
        result.data,

      error:
        null,
    });
  },
);
