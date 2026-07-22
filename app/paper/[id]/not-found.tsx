import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page">
      <h1>Paper not found</h1>
      <p className="meta-line">That triage may have been deleted.</p>
      <p style={{ marginTop: "1rem" }}>
        <Link href="/dashboard" className="btn-primary">
          Back to dashboard
        </Link>
      </p>
    </main>
  );
}
