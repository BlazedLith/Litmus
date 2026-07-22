import OpenAI from "openai";
import { Critique, isCritique } from "@/lib/types";

export const SYSTEM_PROMPT = `You are a research paper triage assistant. Given a paper's title, abstract,
and available body text, and a user's stated research question, produce a
structured critique as JSON with exactly these fields:

- summary: 2-3 sentence plain-language summary of the paper's core claim
- relevance_score: integer 0-100, how relevant this paper is to the user's
  stated research question
- relevance_reason: 1-2 sentences justifying the score
- red_flags: array of strings, each a specific methodological concern
  (e.g. "sample size of 12 with no reported effect size", "no baseline
  comparison method", "metric choice inflates reported performance").
  Empty array if none found — do not invent flags to fill the list.
- strengths: array of strings, specific methodological strengths
- verdict: one of "read fully", "skim", "skip"

Base every claim only on the text provided. If the text is truncated or
insufficient to assess something (e.g. no methods section available), say
so explicitly rather than guessing. Do not fabricate citations, numbers,
or details not present in the input.

Respond with ONLY the JSON object, no markdown fences, no preamble.`;

/** ~6k tokens total input budget (model free tier is 8k in / 4k out). */
const MAX_INPUT_TOKENS = 6_000;
const CHARS_PER_TOKEN = 4;
/** Reserve tokens for system prompt + title/question wrapper. */
const RESERVED_TOKENS = 900;

const GITHUB_MODEL = "openai/gpt-4.1-mini";
const OPENROUTER_MODEL = "openrouter/free";

const USER_FACING_UNAVAILABLE =
  "AI service is temporarily unavailable, try again in a minute";

export type AnalyzeInput = {
  title?: string;
  text: string;
  researchQuestion: string;
};

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function truncatePaperText(text: string, title: string, researchQuestion: string): string {
  const wrapperWithoutBody = `${title}\n\n\n\nResearch question: ${researchQuestion}`;
  const reserved = Math.max(
    RESERVED_TOKENS,
    estimateTokens(SYSTEM_PROMPT) + estimateTokens(wrapperWithoutBody) + 50
  );
  const maxBodyTokens = Math.max(500, MAX_INPUT_TOKENS - reserved);
  const maxBodyChars = maxBodyTokens * CHARS_PER_TOKEN;

  if (text.length <= maxBodyChars) return text;
  return text.slice(0, maxBodyChars);
}

function stripFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) return fenced[1].trim();
  return trimmed;
}

function parseCritique(raw: string): Critique {
  const parsed = JSON.parse(stripFences(raw)) as unknown;
  if (!isCritique(parsed)) {
    throw new Error("Model returned invalid critique JSON");
  }
  const score = Math.max(0, Math.min(100, Math.round(parsed.relevance_score)));
  return { ...parsed, relevance_score: score };
}

function githubClient(): OpenAI {
  const apiKey = process.env.GITHUB_TOKEN;
  if (!apiKey) {
    throw new Error("GITHUB_TOKEN is not configured");
  }
  return new OpenAI({
    apiKey,
    baseURL: "https://models.github.ai/inference",
  });
}

function openRouterClient(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }
  return new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": process.env.AUTH_URL || "http://localhost:3000",
      "X-Title": "Litmus",
    },
  });
}

async function completeCritique(
  client: OpenAI,
  model: string,
  userContent: string
): Promise<Critique> {
  const response = await client.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("Model returned an empty response");
  }
  return parseCritique(raw);
}

function unavailableError(cause?: unknown): Error {
  const err = new Error(USER_FACING_UNAVAILABLE);
  err.name = "AiUnavailableError";
  if (cause !== undefined) {
    (err as Error & { cause?: unknown }).cause = cause;
  }
  return err;
}

/**
 * Structured paper critique via GitHub Models (primary) → OpenRouter free auto-router (fallback).
 */
export async function analyzePaper(input: AnalyzeInput): Promise<Critique> {
  const title = input.title?.trim() || "Untitled";
  const researchQuestion = input.researchQuestion;
  const text = truncatePaperText(input.text, title, researchQuestion);
  const userContent = `${title}\n\n${text}\n\nResearch question: ${researchQuestion}`;

  try {
    const critique = await completeCritique(
      githubClient(),
      GITHUB_MODEL,
      userContent
    );
    return critique;
  } catch (primaryErr) {
    console.warn(
      "[ai] GitHub Models failed, trying OpenRouter fallback:",
      primaryErr instanceof Error ? primaryErr.message : primaryErr
    );

    try {
      const critique = await completeCritique(
        openRouterClient(),
        OPENROUTER_MODEL,
        userContent
      );
      return critique;
    } catch (fallbackErr) {
      console.error(
        "[ai] OpenRouter fallback also failed:",
        fallbackErr instanceof Error ? fallbackErr.message : fallbackErr
      );
      throw unavailableError(fallbackErr);
    }
  }
}
