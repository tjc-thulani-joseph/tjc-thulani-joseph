import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import type {
  TJCAdapterTool,
  TJCAdapterToolResult,
} from "./adapters/types.ts";

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type TJCRole =
  | "ceo"
  | "admin"
  | "editor"
  | "team"
  | "visitor";

export interface TJCToolContext {
  supabase: SupabaseClient;
  userId: string;
  roles: TJCRole[];
  adapterId: string;
}

export interface TJCToolDefinition {
  name: string;
  description: string;

  parameters: TJCAdapterTool["parameters"];

  /**
   * Explicit authorization boundary.
   *
   * A tool may only execute when the authenticated
   * TJC OS user has at least one of these roles.
   */
  allowedRoles: TJCRole[];

  /**
   * Whether this tool is read-only.
   *
   * This is descriptive metadata and is also used
   * as a safety check by the executor.
   */
  readOnly: boolean;

  /**
   * Execute the TJC-owned operation.
   *
   * External AI providers never execute this function.
   */
  execute(
    argumentsValue: Record<string, unknown>,
    context: TJCToolContext,
  ): Promise<Record<string, unknown>>;
}

export interface TJCToolExecutionResult {
  success: boolean;
  toolCall: TJCAdapterToolResult;
  error: {
    code: string;
    message: string;
  } | null;
}

const ALL_ROLES: TJCRole[] = [
  "ceo",
  "admin",
  "editor",
  "team",
  "visitor",
];

function isTJCRole(
  value: unknown,
): value is TJCRole {
  return (
    typeof value === "string" &&
    ALL_ROLES.includes(
      value as TJCRole,
    )
  );
}

/**
 * Convert a user's database role rows into
 * the strict internal role representation.
 */
function normalizeRoles(
  values: unknown[],
): TJCRole[] {
  return [
    ...new Set(
      values.filter(
        isTJCRole,
      ),
    ),
  ];
}

/**
 * Determine whether a user has at least one
 * role authorized for the requested tool.
 */
function hasRequiredRole(
  userRoles: TJCRole[],
  allowedRoles: TJCRole[],
): boolean {
  return allowedRoles.some(
    (role) =>
      userRoles.includes(role),
  );
}

/**
 * Validate that the incoming tool arguments
 * are a plain JSON object.
 */
function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

/**
 * First TJC OS tool.
 *
 * This is intentionally read-only.
 *
 * It does not:
 * - create data
 * - modify data
 * - delete data
 * - publish content
 * - execute SQL
 * - access secrets
 * - call external services
 *
 * It proves that TJC AI can safely reach
 * a TJC-owned operational tool.
 */
const getTJCSystemStatus: TJCToolDefinition =
  {
    name:
      "get_tjc_system_status",

    description:
      "Read the current TJC OS operational status for the authenticated user, including authorization roles, active AI adapter, and TJC knowledge availability.",

    parameters: {
      type: "object",

      properties: {},

      required: [],
    },

    allowedRoles: [
      "ceo",
      "admin",
      "editor",
    ],

    readOnly: true,

    async execute(
      argumentsValue,
      context,
    ) {
      /**
       * This tool currently accepts no arguments.
       */
      if (
        Object.keys(
          argumentsValue,
        ).length > 0
      ) {
        throw new Error(
          "get_tjc_system_status does not accept arguments.",
        );
      }

      /**
       * Confirm the authenticated user's roles
       * directly from Supabase.
       *
       * We intentionally do not trust role data
       * supplied by Gemini or the browser.
       */
      const {
        data: roleRows,
        error: roleError,
      } = await context.supabase
        .from("user_roles")
        .select("role")
        .eq(
          "user_id",
          context.userId,
        );

      if (roleError) {
        throw new Error(
          `Unable to verify TJC OS roles: ${roleError.message}`,
        );
      }

      const databaseRoles =
        normalizeRoles(
          (roleRows ?? []).map(
            (row) =>
              row.role,
          ),
        );

      /**
       * Knowledge availability is read-only.
       *
       * We only expose the count, never the
       * contents of the knowledge records.
       */
      const {
        count: knowledgeCount,
        error:
          knowledgeError,
      } = await context.supabase
        .from("ai_knowledge")
        .select(
          "id",
          {
            count: "exact",
            head: true,
          },
        )
        .eq(
          "status",
          "published",
        )
        .is(
          "deleted_at",
          null,
        );

      if (knowledgeError) {
        throw new Error(
          `Unable to check TJC knowledge availability: ${knowledgeError.message}`,
        );
      }

      return {
        system: "TJC OS",

        status: "operational",

        authenticated: true,

        userId:
          context.userId,

        roles:
          databaseRoles,

        activeAIAdapter:
          context.adapterId,

        knowledge: {
          available:
            knowledgeCount !==
              null &&
            knowledgeCount > 0,

          publishedItems:
            knowledgeCount ??
            0,
        },

        toolSystem: {
          status:
            "operational",

          execution:
            "TJC-controlled",

          externalProviderExecution:
            false,
        },

        checkedAt:
          new Date().toISOString(),
      };
    },
  };

/**
 * The single source of truth for tools currently
 * exposed to TJC AI.
 *
 * Do not add arbitrary database operations here.
 *
 * Every future tool must be explicitly defined,
 * permissioned and validated.
 */
const TOOL_REGISTRY: Record<
  string,
  TJCToolDefinition
> = {
  get_tjc_system_status:
    getTJCSystemStatus,
};

/**
 * Convert the internal tool registry into the
 * provider-neutral adapter contract.
 *
 * Gemini receives this translated description.
 * It does not receive the execute() function.
 */
export function getAvailableTJCTools(
  context: TJCToolContext,
): TJCAdapterTool[] {
  return Object.values(
    TOOL_REGISTRY,
  )
    .filter((tool) =>
      hasRequiredRole(
        context.roles,
        tool.allowedRoles,
      ),
    )
    .map((tool) => ({
      name: tool.name,

      description:
        tool.description,

      parameters:
        tool.parameters,
    }));
}

/**
 * Retrieve a registered tool.
 */
export function getTJCTool(
  name: string,
): TJCToolDefinition | null {
  return (
    TOOL_REGISTRY[name] ??
    null
  );
}

/**
 * Validate a tool name before execution.
 */
function validateToolName(
  name: unknown,
): name is string {
  return (
    typeof name === "string" &&
    name.trim().length > 0 &&
    name.length <= 100
  );
}

/**
 * Validate the tool arguments.
 *
 * This intentionally rejects:
 * - arrays
 * - strings
 * - numbers
 * - null
 * - arbitrary JSON primitives
 *
 * Individual tools perform their own deeper
 * validation after this boundary.
 */
function validateToolArguments(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return isPlainObject(
    value,
  );
}

/**
 * Record an AI tool execution attempt.
 *
 * The Edge Function uses the server-only
 * service-role credential when available.
 *
 * This credential is NEVER returned to the model
 * and is NEVER exposed to the browser.
 *
 * If the credential is unavailable, the tool
 * operation itself is not automatically failed.
 * The failure is logged so deployment/configuration
 * can be corrected separately.
 */
async function recordToolAudit(
  context: TJCToolContext,
  toolName: string,
  status: "success" | "failed" | "denied",
  metadata: Record<
    string,
    unknown
  >,
): Promise<void> {
  const supabaseUrl =
    Deno.env.get(
      "SUPABASE_URL",
    );

  const serviceRoleKey =
    Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    );

  if (
    !supabaseUrl ||
    !serviceRoleKey
  ) {
    console.warn(
      "TJC AI tool audit could not persist because the Supabase service-role configuration is unavailable.",
    );

    return;
  }

  try {
    const serviceClient =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken:
              false,

            persistSession:
              false,
          },
        },
      );

    const {
      error,
    } = await serviceClient
      .from("activity_logs")
      .insert({
        actor_id:
          context.userId,

        action:
          `ai.tool.${toolName}`,

        resource:
          "tjc_ai_tool",

        metadata: {
          tool:
            toolName,

          status,

          adapter:
            context.adapterId,

          ...metadata,
        },

        status:
          status === "success"
            ? "published"
            : "draft",

        created_by:
          context.userId,

        updated_by:
          context.userId,
      });

    if (error) {
      console.error(
        "TJC AI tool audit write failed:",
        error.message,
      );
    }
  } catch (error) {
    console.error(
      "TJC AI tool audit exception:",
      error,
    );
  }
}

/**
 * Execute one TJC-owned tool call.
 *
 * Security sequence:
 *
 * 1. Validate tool name.
 * 2. Look up registered tool.
 * 3. Validate arguments.
 * 4. Check authenticated user's role.
 * 5. Execute the TJC-owned function.
 * 6. Record audit result.
 *
 * Gemini never gets to bypass these checks.
 */
export async function executeTJCTool(
  toolCall: {
    id: string | null;
    name: string;
    arguments: Record<
      string,
      unknown
    >;
  },
  context: TJCToolContext,
): Promise<TJCToolExecutionResult> {
  const toolName =
    toolCall.name;

  /**
   * Unknown tool names are rejected.
   */
  if (
    !validateToolName(
      toolName,
    )
  ) {
    await recordToolAudit(
      context,
      "unknown",
      "denied",
      {
        reason:
          "invalid_tool_name",
      },
    );

    return {
      success: false,

      toolCall: {
        id:
          toolCall.id,

        name:
          typeof toolName ===
          "string"
            ? toolName
            : "unknown",

        result: {
          error:
            "invalid_tool_name",

          message:
            "The requested TJC AI tool name is invalid.",
        },
      },

      error: {
        code:
          "invalid_tool_name",

        message:
          "The requested TJC AI tool name is invalid.",
      },
    };
  }

  const tool =
    getTJCTool(
      toolName,
    );

  if (!tool) {
    await recordToolAudit(
      context,
      toolName,
      "denied",
      {
        reason:
          "tool_not_registered",
      },
    );

    return {
      success: false,

      toolCall: {
        id:
          toolCall.id,

        name:
          toolName,

        result: {
          error:
            "tool_not_registered",

          message:
            "That operation is not registered as a TJC AI tool.",
        },
      },

      error: {
        code:
          "tool_not_registered",

        message:
          "That operation is not registered as a TJC AI tool.",
      },
    };
  }

  /**
   * Validate arguments before any execution.
   */
  if (
    !validateToolArguments(
      toolCall.arguments,
    )
  ) {
    await recordToolAudit(
      context,
      toolName,
      "denied",
      {
        reason:
          "invalid_arguments",
      },
    );

    return {
      success: false,

      toolCall: {
        id:
          toolCall.id,

        name:
          toolName,

        result: {
          error:
            "invalid_arguments",

          message:
            "Tool arguments must be a JSON object.",
        },
      },

      error: {
        code:
          "invalid_arguments",

        message:
          "Tool arguments must be a JSON object.",
      },
    };
  }

  /**
   * Re-check authorization at execution time.
   *
   * The list of tools exposed to Gemini is NOT
   * considered sufficient authorization.
   */
  if (
    !hasRequiredRole(
      context.roles,
      tool.allowedRoles,
    )
  ) {
    await recordToolAudit(
      context,
      toolName,
      "denied",
      {
        reason:
          "permission_denied",

        allowedRoles:
          tool.allowedRoles,
      },
    );

    return {
      success: false,

      toolCall: {
        id:
          toolCall.id,

        name:
          toolName,

        result: {
          error:
            "permission_denied",

          message:
            "The authenticated TJC OS user is not authorized to execute this tool.",
        },
      },

      error: {
        code:
          "permission_denied",

        message:
          "The authenticated TJC OS user is not authorized to execute this tool.",
      },
    };
  }

  /**
   * The first tool is read-only.
   *
   * Keep this safety assertion here so future
   * refactors cannot accidentally turn this
   * first operational tool into a write operation.
   */
  if (
    tool.name ===
      "get_tjc_system_status" &&
    !tool.readOnly
  ) {
    await recordToolAudit(
      context,
      toolName,
      "failed",
      {
        reason:
          "read_only_safety_contract_broken",
      },
    );

    return {
      success: false,

      toolCall: {
        id:
          toolCall.id,

        name:
          toolName,

        result: {
          error:
            "tool_configuration_invalid",

          message:
            "The TJC system-status tool failed its read-only safety contract.",
        },
      },

      error: {
        code:
          "tool_configuration_invalid",

        message:
          "The TJC system-status tool failed its read-only safety contract.",
      },
    };
  }

  try {
    const result =
      await tool.execute(
        toolCall.arguments,
        context,
      );

    await recordToolAudit(
      context,
      toolName,
      "success",
      {
        readOnly:
          tool.readOnly,
      },
    );

    return {
      success: true,

      toolCall: {
        id:
          toolCall.id,

        name:
          toolName,

        result,
      },

      error: null,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "TJC AI tool execution failed.";

    await recordToolAudit(
      context,
      toolName,
      "failed",
      {
        readOnly:
          tool.readOnly,

        error:
          message,
      },
    );

    return {
      success: false,

      toolCall: {
        id:
          toolCall.id,

        name:
          toolName,

        result: {
          error:
            "tool_execution_failed",

          message,
        },
      },

      error: {
        code:
          "tool_execution_failed",

        message,
      },
    };
  }
}

/**
 * Return the currently registered tool names.
 *
 * Useful for diagnostics and future AI Management.
 */
export function listTJCTools(): Array<{
  name: string;
  allowedRoles: TJCRole[];
  readOnly: boolean;
}> {
  return Object.values(
    TOOL_REGISTRY,
  ).map((tool) => ({
    name:
      tool.name,

    allowedRoles:
      [...tool.allowedRoles],

    readOnly:
      tool.readOnly,
  }));
}
