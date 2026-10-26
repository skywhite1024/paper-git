"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SiteHeader() {
  const pathname = usePathname();
  return <header className="site-header"><div className="header-inner">
    <Link className="brand" href="/" aria-label="PaperGit 首页"><span className="atlas-brand-mark" aria-hidden="true"><svg viewBox="0 0 32 38"><path d="m3 10 13-7 13 7-13 7Z M3 18l13 7 13-7 M3 26l13 7 13-7" /></svg></span><span>PaperGit<small>个人研究资料库</small></span></Link>
    <nav aria-label="主导航">{[["/", "研究群岛"], ["/library", "资料库"], ["/reading", "阅读记录"], ["/sources", "资料与来源"]].map(([href, label]) => <Link key={href} href={href} aria-current={(href === "/" ? pathname === "/" || pathname.startsWith("/tracks") : pathname.startsWith(href)) ? "page" : undefined}>{label}</Link>)}</nav>
    <span className="local-tag"><span aria-hidden="true" />PERSONAL LIBRARY</span>
  </div></header>;
}
