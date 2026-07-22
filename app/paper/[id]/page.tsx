import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PaperActions } from "@/components/PaperActions";
import type { Critique } from "@/lib/types";

type PageProps = { params: { id: string } };

export default async function PaperPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const paper = await prisma.paper.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!paper) {
    notFound();
  }

  const critique = paper.critiqueJson as Critique;
  const verdictClass =
    critique.verdict === "read fully"
      ? "read"
      : critique.verdict === "skim"
        ? "skim"
        : "skip";

  return (
    <main className="page">
      <p className="meta-line">
        <Link href="/dashboard">← Dashboard</Link>
      </p>

      <div className="critique-layout">
        <div className="critique-top">
          <div>
            <h1>{paper.title || "Untitled paper"}</h1>
            <p className="meta-line">
              Research question: {paper.researchQuestion}
            </p>
            {paper.sourceUrl ? (
              <p className="meta-line">
                Source:{" "}
                <a href={paper.sourceUrl} target="_blank" rel="noreferrer">
                  {paper.sourceUrl}
                </a>
              </p>
            ) : null}
            <p className={`verdict-tag ${verdictClass}`} style={{ marginTop: "0.75rem" }}>
              Verdict: {critique.verdict}
            </p>
          </div>
          <div className="score-block">
            <div className="big">{paper.relevanceScore}</div>
            <div className="label">relevance / 100</div>
          </div>
        </div>

        <PaperActions
          paperId={paper.id}
          title={paper.title}
          researchQuestion={paper.researchQuestion}
          sourceUrl={paper.sourceUrl}
          critique={critique}
        />

        <section className="section">
          <h2>Summary</h2>
          <p>{critique.summary}</p>
        </section>

        <section className="section">
          <h2>Why this score</h2>
          <p>{critique.relevance_reason}</p>
        </section>

        <section className="section">
          <h2>Red flags</h2>
          {critique.red_flags.length === 0 ? (
            <p>None found in the provided text.</p>
          ) : (
            <ul>
              {critique.red_flags.map((flag) => (
                <li key={flag}>{flag}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="section">
          <h2>Strengths</h2>
          {critique.strengths.length === 0 ? (
            <p>None noted in the provided text.</p>
          ) : (
            <ul>
              {critique.strengths.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
