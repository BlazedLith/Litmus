"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { Critique } from "@/lib/types";

type Props = {
  paperId: string;
  title: string | null;
  researchQuestion: string;
  sourceUrl: string | null;
  critique: Critique;
};

export function PaperActions({
  paperId,
  title: initialTitle,
  researchQuestion: initialQuestion,
  sourceUrl: initialUrl,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle || "");
  const [researchQuestion, setResearchQuestion] = useState(initialQuestion);
  const [sourceUrl, setSourceUrl] = useState(initialUrl || "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/papers/${paperId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || null,
          researchQuestion: researchQuestion.trim(),
          sourceUrl: sourceUrl.trim() || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not save changes");
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("Network error while saving");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!confirm("Delete this paper triage? This cannot be undone.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/papers/${paperId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error || "Could not delete");
        setBusy(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error while deleting");
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <form onSubmit={onSave} className="edit-form">
        <label className="field">
          <span>Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="field">
          <span>Research question</span>
          <input
            value={researchQuestion}
            onChange={(e) => setResearchQuestion(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Source URL</span>
          <input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="cta-row">
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setEditing(false)}
            disabled={busy}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="paper-actions">
      {error ? <p className="form-error">{error}</p> : null}
      <button
        type="button"
        className="btn-ghost"
        onClick={() => setEditing(true)}
        disabled={busy}
      >
        Edit
      </button>
      <button
        type="button"
        className="btn-danger"
        onClick={onDelete}
        disabled={busy}
      >
        Delete
      </button>
    </div>
  );
}
