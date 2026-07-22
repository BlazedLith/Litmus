"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type TriageFormProps = {
  signedIn: boolean;
};

export function TriageForm({ signedIn }: TriageFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [text, setText] = useState("");
  const [researchQuestion, setResearchQuestion] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!signedIn) {
      setError("Sign in with GitHub to run a triage.");
      return;
    }

    if (!researchQuestion.trim()) {
      setError("Add your research question so Litmus can score relevance.");
      return;
    }

    if (!text.trim() && !pdf) {
      setError("Paste abstract text or upload a PDF.");
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      if (title.trim()) form.set("title", title.trim());
      if (sourceUrl.trim()) form.set("sourceUrl", sourceUrl.trim());
      form.set("researchQuestion", researchQuestion.trim());
      if (text.trim()) form.set("text", text.trim());
      if (pdf) form.set("pdf", pdf);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as { id?: string; error?: string };

      if (!res.ok) {
        setError(data.error || "Analysis failed. Try again.");
        return;
      }

      if (data.id) {
        router.push(`/paper/${data.id}`);
        router.refresh();
      }
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="triage-form">
      <label className="field">
        <span>Research question</span>
        <input
          value={researchQuestion}
          onChange={(e) => setResearchQuestion(e.target.value)}
          placeholder="e.g. How do retrieval-augmented models fail on long-context QA?"
          required
        />
      </label>

      <label className="field">
        <span>Title (optional)</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Paper title"
        />
      </label>

      <label className="field">
        <span>Source URL (optional)</span>
        <input
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="https://arxiv.org/abs/..."
        />
      </label>

      <label className="field">
        <span>Paste abstract or body text</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder="Paste the abstract (and any available body text) here…"
        />
      </label>

      <label className="field file-field">
        <span>Or upload a PDF</span>
        <input
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
        />
        {pdf ? <em className="file-name">{pdf.name}</em> : null}
      </label>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <div className="cta-row">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Triaging…" : "Run triage"}
        </button>
        {!signedIn ? (
          <p className="hint">Sign in above first — triage saves to your dashboard.</p>
        ) : null}
      </div>
    </form>
  );
}
