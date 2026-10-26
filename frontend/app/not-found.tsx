import Link from "next/link";
export default function NotFound() { return <div className="empty-state"><p className="eyebrow">404 / NOT IN THIS COLLECTION</p><h1>这份资料还不在书架上</h1><p>链接可能已失效，也可以从三条研究路线重新开始。</p><Link className="button primary" href="/">返回研究路线 →</Link></div>; }
