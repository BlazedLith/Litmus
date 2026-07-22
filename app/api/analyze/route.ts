import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { analyzePaper } from "@/lib/ai";
import { extractTextFromPdf } from "@/lib/pdf";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60;

async function requireUserId() {
    const session = await auth();
    if (!session?.user?.id) {
        return null;
    }
    return session.user.id;
}

export async function POST(request: Request) {
    const userId = await requireUserId();
    if (!userId) {
        return NextResponse.json(
            { error: "Sign in required" },
            { status: 401 },
        );
    }

    try {
        const contentType = request.headers.get("content-type") || "";
        let title: string | undefined;
        let sourceUrl: string | undefined;
        let researchQuestion = "";
        let text = "";

        if (contentType.includes("multipart/form-data")) {
            const form = await request.formData();
            title = String(form.get("title") || "").trim() || undefined;
            sourceUrl = String(form.get("sourceUrl") || "").trim() || undefined;
            researchQuestion = String(
                form.get("researchQuestion") || "",
            ).trim();
            text = String(form.get("text") || "").trim();

            const file = form.get("pdf");
            if (file instanceof File && file.size > 0) {
                if (file.type && file.type !== "application/pdf") {
                    return NextResponse.json(
                        { error: "Only PDF files are supported" },
                        { status: 400 },
                    );
                }
                const buffer = Buffer.from(await file.arrayBuffer());
                try {
                    const pdfText = await extractTextFromPdf(buffer);
                    text = text ? `${text}\n\n${pdfText}` : pdfText;
                    if (!title) {
                        title = file.name.replace(/\.pdf$/i, "") || undefined;
                    }
                } catch (err) {
                    const message =
                        err instanceof Error
                            ? err.message
                            : "Couldn't extract text from this PDF";
                    return NextResponse.json(
                        { error: message },
                        { status: 400 },
                    );
                }
            }
        } else {
            const body = (await request.json()) as {
                title?: string;
                sourceUrl?: string;
                text?: string;
                researchQuestion?: string;
            };
            title = body.title?.trim() || undefined;
            sourceUrl = body.sourceUrl?.trim() || undefined;
            text = (body.text || "").trim();
            researchQuestion = (body.researchQuestion || "").trim();
        }

        if (!researchQuestion) {
            return NextResponse.json(
                { error: "Research question is required" },
                { status: 400 },
            );
        }

        if (!text || text.length < 40) {
            return NextResponse.json(
                {
                    error: "Paste an abstract or upload a PDF with extractable text (at least ~40 characters).",
                },
                { status: 400 },
            );
        }

        const critique = await analyzePaper({
            title,
            text,
            researchQuestion,
        });

        const paper = await prisma.paper.create({
            data: {
                userId,
                title: title || null,
                sourceUrl: sourceUrl || null,
                rawText: text.slice(0, 50_000),
                researchQuestion,
                critiqueJson: critique,
                relevanceScore: critique.relevance_score,
            },
        });

        return NextResponse.json({ id: paper.id, critique });
    } catch (err) {
        const isUnavailable =
            err instanceof Error &&
            (err.name === "AiUnavailableError" ||
                err.name === "RateLimitError");
        const message = isUnavailable
            ? "AI service is temporarily unavailable, try again in a minute"
            : err instanceof Error
              ? err.message
              : "Analysis failed";
        const status = isUnavailable ? 503 : 500;
        console.error("analyze error:", err);
        return NextResponse.json({ error: message }, { status });
    }
}
