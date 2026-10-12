"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import GlobalSearch from "@/components/GlobalSearch";
import { L } from "@/lib/lexicon";
import { cx } from "@/components/ui";

type Theme = "light" | "dark";

function readTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem("pg-theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    window.localStorage.setItem("pg-theme", next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? L.nav.themeLight : L.nav.themeDark}
      title={theme === "dark" ? L.nav.themeLight : L.nav.themeDark}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line text-muted transition-colors hover:bg-raised hover:text-fg"
    >
      <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none">
        {theme === "dark" ? (
          <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.8" />
        ) : (
          <path
            d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </button>
  );
}

const PRIMARY = [
  { href: "/", label: L.nav.topology },
  { href: "/routes", label: L.nav.routes },
];
const TREES = [
  { href: "/nodes/ai", label: L.nav.treeAI },
  { href: "/nodes/cs", label: L.nav.treeCS },
  { href: "/nodes/robotics", label: L.nav.treeRobotics },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  onNavigate,
  block,
}: {
  href: string;
  label: string;
  onNavigate?: () => void;
  block?: boolean;
}) {
  const pathname = usePathname();
  const on = isActive(pathname, href);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={on ? "page" : undefined}
      className={cx(
        "shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm transition-colors",
        block && "w-full",
        on ? "bg-accent-soft font-semibold text-accent" : "text-muted hover:bg-raised hover:text-fg"
      )}
    >
      {label}
    </Link>
  );
}

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-md supports-[backdrop-filter]:bg-surface/70">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4 sm:gap-4">
        <Link href="/" className="flex shrink-0 items-baseline gap-2" aria-label={L.brand}>
          <span className="text-[17px] font-bold tracking-tight text-fg">{L.brand}</span>
          <span className="hidden whitespace-nowrap text-xs text-subtle lg:inline">{L.brandSub}</span>
        </Link>

        <nav aria-label={L.nav.primary} className="hidden items-center gap-0.5 md:flex">
          {PRIMARY.map((i) => (
            <NavLink key={i.href} {...i} />
          ))}
          <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-line" />
          {TREES.map((i) => (
            <NavLink key={i.href} {...i} />
          ))}
        </nav>

        <GlobalSearch className="ml-auto min-w-0 flex-1 md:max-w-[320px] lg:max-w-[380px]" />

        <Link
          href="/watchlist"
          className="hidden shrink-0 items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-sm text-muted transition-colors hover:bg-raised hover:text-fg sm:inline-flex"
        >
          <svg aria-hidden width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3.5 14.6 9l5.9.8-4.3 4.1 1 5.9-5.2-2.8L6.8 19.8l1-5.9L3.5 9.8 9.4 9 12 3.5Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
          </svg>
          {L.nav.watchlist}
        </Link>

        <ThemeToggle />

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-label={L.nav.menu}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line text-muted hover:bg-raised md:hidden"
        >
          <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {menuOpen && (
        <nav
          aria-label={L.nav.mobile}
          className="pg-enter border-t border-line bg-surface px-4 py-2 md:hidden"
        >
          <div className="flex flex-col gap-0.5">
            {[...PRIMARY, ...TREES, { href: "/watchlist", label: L.nav.watchlist }].map((i) => (
              <NavLink key={i.href} {...i} block onNavigate={() => setMenuOpen(false)} />
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
