"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { API_BASE, clientGet } from "@/lib/api";
import { L } from "@/lib/lexicon";

type WatchList = { user: string; nodes: { id: string }[] };

function Star({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="h-3.5 w-3.5">
      <path
        d="M8 1.6l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.4l-3.8 2 .7-4.3-3.1-3 4.3-.6z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function WatchButton({ nodeId, nodeName }: { nodeId: string; nodeName?: string }) {
  const [watching, setWatching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    clientGet<WatchList>("/api/watch", ac.signal)
      .then((d) => setWatching(d.nodes.some((n) => n.id === nodeId)))
      .catch(() => setFailed(true));
    return () => ac.abort();
  }, [nodeId]);

  const toggle = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const res = watching
        ? await fetch(`${API_BASE}/api/watch/${encodeURIComponent(nodeId)}`, { method: "DELETE" })
        : await fetch(`${API_BASE}/api/watch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ node_id: nodeId }),
          });
      if (!res.ok) throw new Error(String(res.status));
      setWatching(!watching);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const label = watching ? L.node.watching : L.node.watch;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant={watching ? "primary" : "default"}
        size="sm"
        onClick={toggle}
        disabled={busy}
        aria-pressed={watching}
        aria-label={nodeName ? L.node.watchAria(nodeName, label) : label}
        title={nodeName ? L.node.watchHint(nodeName) : undefined}
      >
        <Star filled={watching} />
        {busy ? L.node.watchBusy : label}
      </Button>
      {failed ? <span className="text-xs text-danger">{L.node.watchFailed}</span> : null}
    </div>
  );
}
