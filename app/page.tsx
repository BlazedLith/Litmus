import { auth } from "@/lib/auth";
import { TriageForm } from "@/components/TriageForm";

export default async function HomePage() {
  const session = await auth();

  return (
    <main className="hero">
      <div className="hero-copy">
        <h1 className="brand-hero">
          Lit<em>mus</em>
        </h1>
        <p className="hero-line">
          Test a paper against your research question before you sink hours into it.
        </p>
        <p className="hero-sub">Paste an abstract or upload a PDF. Get a score, red flags, and a verdict.</p>
      </div>
      <div className="triage-panel">
        <TriageForm signedIn={Boolean(session?.user)} />
      </div>
    </main>
  );
}
