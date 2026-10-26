"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SiteHeader() {
  const pathname = usePathname();
  return <header className="site-header"><div className="header-inner">
    <Link className="brand" href="/" aria-label="PaperGit 首页"><span className="brand-mark" aria-hidden="true">p<span>.</span></span><span>PaperGit<small>个人研究资料库</small></span></Link>
    <nav aria-label="主导航">{[["/", "研究路线"], ["/library", "资料库"], ["/reading", "阅读记录"], ["/sources", "资料与来源"]].map(([href, label]) => <Link key={href} href={href} aria-current={(href === "/" ? pathname === "/" || pathname.startsWith("/tracks") : pathname.startsWith(href)) ? "page" : undefined}>{label}</Link>)}</nav>
    <span className="local-tag"><span aria-hidden="true" />PERSONAL LIBRARY</span>
  </div></header>;
}
