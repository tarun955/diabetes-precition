"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BrainCircuit, ChevronRight, ClipboardPenLine, FileChartColumn, Gauge, Lightbulb, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

const links = [
  { href: "/", label: "Overview", icon: Gauge },
  { href: "/predict", label: "Predict", icon: ClipboardPenLine },
  { href: "/compare", label: "Compare models", icon: BarChart3 },
  { href: "/insights", label: "Insights", icon: Lightbulb },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="Diabetes Ensemble Lab home">
          <span className="brand-mark"><BrainCircuit size={22} strokeWidth={2.3} /></span>
          <span>
            <strong>ensemble</strong>
            <small>diabetes lab</small>
          </span>
        </Link>

        <div className="sidebar-label">Workspace</div>
        <nav className="main-nav" aria-label="Primary navigation">
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={`nav-item ${active ? "active" : ""}`}>
                <Icon size={17} />
                <span>{label}</span>
                {active && <ChevronRight size={15} className="nav-chevron" />}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-spacer" />
        <div className="rubric-card">
          <div className="rubric-icon"><FileChartColumn size={16} /></div>
          <div>
            <strong>Mini-project ready</strong>
            <p>Notebook, tuning, metrics &amp; presentation evidence.</p>
          </div>
        </div>
        <div className="sidebar-footnote"><Sparkles size={13} /> Built for model clarity</div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
