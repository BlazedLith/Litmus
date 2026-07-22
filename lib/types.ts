export type Verdict = "read fully" | "skim" | "skip";

export type Critique = {
  summary: string;
  relevance_score: number;
  relevance_reason: string;
  red_flags: string[];
  strengths: string[];
  verdict: Verdict;
};

export function isCritique(value: unknown): value is Critique {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.summary === "string" &&
    typeof v.relevance_score === "number" &&
    typeof v.relevance_reason === "string" &&
    Array.isArray(v.red_flags) &&
    Array.isArray(v.strengths) &&
    (v.verdict === "read fully" ||
      v.verdict === "skim" ||
      v.verdict === "skip")
  );
}
