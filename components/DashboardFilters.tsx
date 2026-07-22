"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  currentSort: string;
  currentVerdict: string;
};

export function DashboardFilters({ currentSort, currentVerdict }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <div className="filters">
      <label>
        Sort
        <select
          value={currentSort}
          onChange={(e) => update("sort", e.target.value)}
        >
          <option value="relevance">Relevance</option>
          <option value="newest">Newest</option>
        </select>
      </label>
      <label>
        Verdict
        <select
          value={currentVerdict || "all"}
          onChange={(e) => update("verdict", e.target.value)}
        >
          <option value="all">All</option>
          <option value="read fully">Read fully</option>
          <option value="skim">Skim</option>
          <option value="skip">Skip</option>
        </select>
      </label>
      <Link href="/" className="btn-primary compact">
        New triage
      </Link>
    </div>
  );
}
