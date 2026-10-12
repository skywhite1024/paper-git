import { API_BASE } from "@/lib/api";
import { Eyebrow } from "@/components/ui";
import { L } from "@/lib/lexicon";
import WatchlistClient, { type Digest, type Section } from "./WatchlistClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: L.watchlist.title,
  description: L.watchlist.subtitle(14),
};

/** 与关注页时间窗口按钮保持一致；默认窗口决定服务端首屏取哪一段。 */
const WINDOWS = [7, 14, 30];
const DEFAULT_DAYS = 14;

/**
 * 关注列表随请求变化（用户可能刚点关注），因此显式 no-store，
 * 不吃 lib/api 里 60 秒的默认缓存。
 */
async function fetchDigest(days: number): Promise<Digest | null> {
  try {
    const res = await fetch(`${API_BASE}/api/watch/digest?days=${days}`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as Digest;
  } catch {
    return null;
  }
}

export default async function WatchlistPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const requested = Number(sp.days);
  const days = WINDOWS.includes(requested) ? requested : DEFAULT_DAYS;
  const digest = await fetchDigest(days);
  const sections: Section[] | null = digest ? digest.sections : null;

  return (
    <div>
      <Eyebrow className="block">{L.nav.watchlist}</Eyebrow>
      <WatchlistClient initialDays={days} initialSections={sections} />
    </div>
  );
}
