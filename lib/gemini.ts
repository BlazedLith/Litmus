import { GoogleGenAI } from "@google/genai";
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

const MAX_BODY_CHARS = 15_000;

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenAI({ apiKey });
}

function stripFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) return fenced[1].trim();
  return trimmed;
}

export type AnalyzeInput = {
  title?: string;
  text: string;
  researchQuestion: string;
};

export async function analyze(input: AnalyzeInput): Promise<Critique> {
  const body = input.text.slice(0, MAX_BODY_CHARS);
  const title = input.title?.trim() || "Untitled";
  const userContent = `${title}\n\n${body}\n\nResearch question: ${input.researchQuestion}`;

  const ai = getClient();

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userContent,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const raw = response.text;
    if (!raw) {
      throw new Error("Gemini returned an empty response");
    }

    const parsed = JSON.parse(stripFences(raw)) as unknown;
    if (!isCritique(parsed)) {
      throw new Error("Gemini returned invalid critique JSON");
    }

    const score = Math.max(0, Math.min(100, Math.round(parsed.relevance_score)));
    return { ...parsed, relevance_score: score };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/429|rate.?limit|quota/i.test(message)) {
      const rateErr = new Error(
        "Gemini rate limit hit. Wait a moment and try again."
      );
      rateErr.name = "RateLimitError";
      throw rateErr;
    }
    throw err;
  }
}
