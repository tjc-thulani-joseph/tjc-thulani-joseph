import gemini from "./engines/gemini.ts";

export type AIEngineId = "gemini";

export function getActiveAIEngine() {
  return gemini;
}

export function getAIEngine(
  id: AIEngineId,
) {
  return id === "gemini"
    ? gemini
    : null;
}
