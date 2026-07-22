import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const verdict = searchParams.get("verdict");
  const sort = searchParams.get("sort") || "relevance";

  const papers = await prisma.paper.findMany({
    where: { userId },
    orderBy:
      sort === "newest"
        ? { createdAt: "desc" }
        : [{ relevanceScore: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      researchQuestion: true,
      relevanceScore: true,
      critiqueJson: true,
      createdAt: true,
      sourceUrl: true,
    },
  });

  const filtered =
    verdict && ["read fully", "skim", "skip"].includes(verdict)
      ? papers.filter((p) => {
          const c = p.critiqueJson as { verdict?: string };
          return c?.verdict === verdict;
        })
      : papers;

  return NextResponse.json({ papers: filtered });
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const body = (await request.json()) as {
    title?: string;
    sourceUrl?: string;
    rawText?: string;
    researchQuestion: string;
    critiqueJson: unknown;
    relevanceScore: number;
  };

  if (!body.researchQuestion || body.critiqueJson == null) {
    return NextResponse.json(
      { error: "researchQuestion and critiqueJson are required" },
      { status: 400 }
    );
  }

  const paper = await prisma.paper.create({
    data: {
      userId,
      title: body.title || null,
      sourceUrl: body.sourceUrl || null,
      rawText: body.rawText || null,
      researchQuestion: body.researchQuestion,
      critiqueJson: body.critiqueJson as object,
      relevanceScore: body.relevanceScore ?? 0,
    },
  });

  return NextResponse.json({ paper }, { status: 201 });
}
