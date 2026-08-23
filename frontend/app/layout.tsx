import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { L } from "@/lib/lexicon";

export const metadata: Metadata = {
  title: "PaperGit · 研究脉络图谱",
  description: "三维知识拓扑与领域树：追踪人工智能、计算机科学、机器人学的研究路线与进展。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">
        <header className="border-b border-slate-800 bg-[#0d1117] text-white">
          <div className="mx-auto flex max-w-7xl items-center gap-5 px-4 py-2.5">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="text-lg font-bold tracking-tight">{L.brand}</span>
              <span className="text-xs text-slate-400">{L.brandSub}</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm text-slate-300">
              <Link href="/" className="font-medium text-white hover:text-sky-300">
                {L.nav.topology}
              </Link>
              <Link href="/routes" className="hover:text-white">
                {L.nav.routes}
              </Link>
              <span className="h-3 w-px bg-slate-700" />
              <Link href="/nodes/ai" className="hover:text-white">
                {L.nav.treeAI}
              </Link>
              <Link href="/nodes/cs" className="hover:text-white">
                {L.nav.treeCS}
              </Link>
              <Link href="/nodes/robotics" className="hover:text-white">
                {L.nav.treeRobotics}
              </Link>
            </nav>
            <form action="/search" className="ml-auto flex-1 max-w-sm">
              <input
                name="q"
                placeholder={L.search.placeholder}
                className="w-full rounded-md border border-slate-700 bg-[#161b22] px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
              />
            </form>
            <Link
              href="/watchlist"
              className="rounded-md border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
            >
              {L.nav.watchlist}
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-5">{children}</main>
        <footer className="mt-10 border-t border-[var(--pg-border)] py-5 text-center text-xs text-gray-500">
          数据来源：arXiv · OpenAlex ／ PaperGit 开源研究脉络项目 · 元数据仅用于研究目的
        </footer>
      </body>
    </html>
  );
}
