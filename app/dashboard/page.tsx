import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardFilters } from "@/components/DashboardFilters";
import type { Critique } from "@/lib/types";

type SearchParams = { sort?: string; verdict?: string };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const sort = searchParams.sort === "newest" ? "newest" : "relevance";
  const verdict = searchParams.verdict || "";

  const papers = await prisma.paper.findMany({
    where: { userId: session.user.id },
    orderBy:
      sort === "newest"
        ? { createdAt: "desc" }
        : [{ relevanceScore: "desc" }, { createdAt: "desc" }],
  });

  const filtered = verdict
    ? papers.filter((p) => {
        const c = p.critiqueJson as Critique;
        return c?.verdict === verdict;
      })
    : papers;

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Your saved triages, sorted by relevance by default.</p>
        </div>
        <Suspense fallback={null}>
          <DashboardFilters currentSort={sort} currentVerdict={verdict} />
        </Suspense>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>No papers yet. Run a triage from the home page.</p>
          <p style={{ marginTop: "1rem" }}>
            <Link href="/" className="btn-primary">
              New triage
            </Link>
          </p>
        </div>
      ) : (
        <ul className="paper-list">
          {filtered.map((paper) => {
            const critique = paper.critiqueJson as Critique;
            const verdictClass =
              critique.verdict === "read fully"
                ? "read"
                : critique.verdict === "skim"
                  ? "skim"
                  : "skip";
            return (
              <li key={paper.id}>
                <Link href={`/paper/${paper.id}`}>
                  <div className="score-pill">{paper.relevanceScore}</div>
                  <div className="paper-meta">
                    <h2>{paper.title || "Untitled paper"}</h2>
                    <p>{paper.researchQuestion}</p>
                  </div>
                  <div className={`verdict-tag ${verdictClass}`}>
                    {critique.verdict}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
