"use client";
import Link from "next/link";
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="empty-state"><h1>页面暂时未能加载</h1><p>请重试，或返回研究路线继续浏览。</p><div className="button-row"><button className="button primary" onClick={reset}>重新加载</button><Link className="button" href="/">返回首页</Link></div></div>;
}
