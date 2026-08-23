"use client";

import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function WatchButton({ nodeId }: { nodeId: string }) {
  const [watching, setWatching] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    try {
      if (watching) {
        const res = await fetch(`${API_BASE}/api/watch/${nodeId}`, { method: "DELETE" });
        setWatching(!res.ok);
      } else {
        const res = await fetch(`${API_BASE}/api/watch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ node_id: nodeId }),
        });
        setWatching(res.ok);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
        watching
          ? "border-amber-400 bg-amber-50 text-amber-700"
          : "border-[var(--pg-border)] bg-white text-gray-700 hover:bg-gray-50"
      }`}
    >
      {watching === null ? "☆ 关注" : watching ? "★ 已关注" : "☆ 关注"}
    </button>
  );
}
