import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "PaperGit · 论文追踪与可视化",
  description: "以领域树追踪 AI / CS / Robotics 研究进展：论文聚合、时间线脉络、趋势可视化。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">
        <header className="bg-[#0d1117] text-white">
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
              <span className="rounded bg-blue-600 px-1.5 py-0.5 text-sm">PG</span>
              PaperGit
            </Link>
            <nav className="flex items-center gap-3 text-sm text-gray-300">
              <Link href="/nodes/ai" className="hover:text-white">AI</Link>
              <Link href="/nodes/cs" className="hover:text-white">计算机科学</Link>
              <Link href="/nodes/robotics" className="hover:text-white">机器人</Link>
              <Link href="/watchlist" className="hover:text-white">我的关注</Link>
            </nav>
            <form action="/search" className="ml-auto flex-1 max-w-md">
              <input
                name="q"
                placeholder="搜索论文 / 研究方向…"
                className="w-full rounded-md border border-gray-600 bg-[#161b22] px-3 py-1.5 text-sm text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              />
            </form>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        <footer className="mt-12 border-t border-[var(--pg-border)] py-6 text-center text-xs text-gray-500">
          数据来源：arXiv / OpenAlex · PaperGit 是开源的论文进展追踪项目 · 元数据仅用于研究目的
        </footer>
      </body>
    </html>
  );
}
