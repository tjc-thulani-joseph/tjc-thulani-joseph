import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface TJCKnowledgeRecord {
  id: string;
  title: string;
  description: string | null;
  content: string;
  category: string | null;
  tags: string[] | null;
  source_type: string | null;
  source_ref: string | null;
  position: number | null;
}

export interface TJCKnowledgeResult extends TJCKnowledgeRecord {
  score: number;
}

interface RetrieveTJCKnowledgeResponse {
  data: TJCKnowledgeResult[];
  error: {
    message: string;
    code: string;
  } | null;
}

const MAX_RECORDS_TO_SCAN = 250;
const DEFAULT_RESULT_LIMIT = 5;

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "was",
  "what",
  "when",
  "where",
  "who",
  "why",
  "with",
  "you",
]);

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  return [...new Set(
    normalizeText(value)
      .split(" ")
      .filter((token) => token.length >= 2 && !STOP_WORDS.has(token)),
  )];
}

function scoreField(
  fieldValue: string,
  query: string,
  tokens: string[],
  weight: number,
): number {
  const field = normalizeText(fieldValue);

  if (!field) {
    return 0;
  }

  let score = 0;

  if (query && field.includes(query)) {
    score += weight * 4;
  }

  for (const token of tokens) {
    if (field.includes(token)) {
      score += weight;
    }
  }

  return score;
}

function scoreRecord(
  record: TJCKnowledgeRecord,
  query: string,
  tokens: string[],
): number {
  let score = 0;

  score += scoreField(record.title, query, tokens, 12);
  score += scoreField(record.category ?? "", query, tokens, 8);
  score += scoreField(record.tags?.join(" ") ?? "", query, tokens, 9);
  score += scoreField(record.description ?? "", query, tokens, 5);
  score += scoreField(record.content, query, tokens, 2);

  const normalizedTitle = normalizeText(record.title);
  const normalizedContent = normalizeText(record.content);

  if (query && normalizedTitle === query) {
    score += 40;
  }

  if (query && normalizedContent.includes(query)) {
    score += 10;
  }

  return score;
}

export async function retrieveTJCKnowledge(
  supabase: SupabaseClient,
  query: string,
  limit = DEFAULT_RESULT_LIMIT,
): Promise<RetrieveTJCKnowledgeResponse> {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return {
      data: [],
      error: null,
    };
  }

  const safeLimit = Math.max(
    1,
    Math.min(Number.isFinite(limit) ? Math.floor(limit) : DEFAULT_RESULT_LIMIT, 10),
  );

  const tokens = tokenize(normalizedQuery);

  if (tokens.length === 0) {
    return {
      data: [],
      error: null,
    };
  }

  const { data, error } = await supabase
    .from("ai_knowledge")
    .select(
      [
        "id",
        "title",
        "description",
        "content",
        "category",
        "tags",
        "source_type",
        "source_ref",
        "position",
      ].join(","),
    )
    .eq("status", "published")
    .is("deleted_at", null)
    .limit(MAX_RECORDS_TO_SCAN);

  if (error) {
    return {
      data: [],
      error: {
        code: "KNOWLEDGE_RETRIEVAL_FAILED",
        message: error.message,
      },
    };
  }

  const records = (data ?? []) as TJCKnowledgeRecord[];

  const ranked = records
    .map((record) => ({
      ...record,
      score: scoreRecord(record, normalizedQuery, tokens),
    }))
    .filter((record) => record.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      const aPosition = a.position ?? Number.MAX_SAFE_INTEGER;
      const bPosition = b.position ?? Number.MAX_SAFE_INTEGER;

      if (aPosition !== bPosition) {
        return aPosition - bPosition;
      }

      return a.title.localeCompare(b.title);
    })
    .slice(0, safeLimit);

  return {
    data: ranked,
    error: null,
  };
}
