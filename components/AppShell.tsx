"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const links = [
  { href: "/", label: "Start here" },
  { href: "/predict", label: "Try a profile" },
  { href: "/compare", label: "Compare models" },
  { href: "/insights", label: "Understand the data" },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="site-shell">
      <header className="site-header">
        <Link href="/" className="wordmark" aria-label="Diabetes model study home">
          <span className="wordmark-dot" aria-hidden="true" />
          <span>Diabetes model study</span>
        </Link>
        <nav className="site-nav" aria-label="Main navigation">
          {links.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return <Link className={active ? "active" : ""} href={link.href} key={link.href}>{link.label}</Link>;
          })}
        </nav>
        <Link href="/predict" className="header-action">Try an example <span aria-hidden="true">↗</span></Link>
      </header>
      <main>{children}</main>
    </div>
  );
}
