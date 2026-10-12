import type { Metadata, Viewport } from "next";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";
import { L } from "@/lib/lexicon";

export const metadata: Metadata = {
  title: {
    default: `${L.brand} · ${L.brandSub}`,
    template: `%s · ${L.brand}`,
  },
  description: "三维知识拓扑与领域树：追踪人工智能、计算机科学、机器人学的研究路线与进展。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0d14" },
  ],
};

// Applies the stored theme before first paint so the shell never flashes.
const THEME_INIT = `try{var t=localStorage.getItem('pg-theme');if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.setAttribute('data-theme',t);}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="min-h-screen bg-bg antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-3 focus:py-1.5 focus:text-sm focus:text-accent-fg"
        >
          跳到主内容
        </a>
        <SiteHeader />
        <main id="main" className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:py-6">
          {children}
        </main>
        <footer className="mt-10 border-t border-line py-6">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2 px-4 text-xs text-subtle">
            <p>数据来源：arXiv · OpenAlex ／ {L.brand} 开源研究脉络项目 · 元数据仅用于研究目的</p>
            <p className="tabular-nums">共 67 个领域节点 · 持续增量收录</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
