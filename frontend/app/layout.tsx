import type { Metadata, Viewport } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import ReadingProvider from "@/components/ReadingProvider";
import "./globals.css";
import "./atlas.css";

export const metadata: Metadata = {
  title: { default: "PaperGit · 个人研究资料库", template: "%s · PaperGit" },
  description: "世界模型、VLA 与 Robot Agentic 的精选研究路线、论文和本地阅读笔记。",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#faf9f5" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN" data-scroll-behavior="smooth"><body><ReadingProvider>
    <a className="skip-link" href="#main">跳到主内容</a>
    <SiteHeader />
    <main id="main" className="container">{children}</main>
    <footer className="site-footer"><div className="container"><span><strong>PaperGit</strong> / 一点一点，读出脉络。</span><Link href="/sources">精选资料 · 来源可查 · 笔记留在本地 ↗</Link></div></footer>
  </ReadingProvider></body></html>;
}
