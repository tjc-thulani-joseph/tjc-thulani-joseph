export {
  TJC_AI_IDENTITY,
} from "./types";

export type {
  AIMessageRole,
  AIMessage,
  AICapability,
  AIModelDescriptor,
  AIRequest,
  AIUsage,
  AIResponse,
  AIToolCall,
  AIError,
  AIResult,
} from "./types";

export type {
  AIEngineId,
  AIEngineStatus,
  AIEngineDefinition,
} from "./engine-registry";

export {
  AI_ENGINES,
  getAIEngine,
  getSelectableAIEngines,
  getActiveAIEngine,
} from "./engine-registry";

export type {
  AIEngineHealth,
  AIEngineAdapter,
} from "./provider-adapter";
