import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: { id: string } };

async function requireUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const paper = await prisma.paper.findFirst({
    where: { id: params.id, userId },
  });

  if (!paper) {
    return NextResponse.json({ error: "Paper not found" }, { status: 404 });
  }

  return NextResponse.json({ paper });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const existing = await prisma.paper.findFirst({
    where: { id: params.id, userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Paper not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    title?: string | null;
    researchQuestion?: string;
    sourceUrl?: string | null;
  };

  const paper = await prisma.paper.update({
    where: { id: params.id },
    data: {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.researchQuestion !== undefined
        ? { researchQuestion: body.researchQuestion }
        : {}),
      ...(body.sourceUrl !== undefined ? { sourceUrl: body.sourceUrl } : {}),
    },
  });

  return NextResponse.json({ paper });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const existing = await prisma.paper.findFirst({
    where: { id: params.id, userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Paper not found" }, { status: 404 });
  }

  await prisma.paper.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
