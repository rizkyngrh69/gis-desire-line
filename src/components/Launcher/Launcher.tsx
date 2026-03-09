"use client";

import type { AppMode } from "@/types";

interface LauncherProps {
  onSelect: (mode: AppMode) => void;
}

const TOOLS: {
  mode: AppMode;
  accent: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
  icon: React.ReactNode;
}[] = [
  {
    mode: "desire-lines",
    accent: "#6366f1",
    accentBg: "bg-accent/10 group-hover:bg-accent/15",
    accentBorder: "border-accent/20 group-hover:border-accent/50",
    accentText: "text-accent",
    title: "Desire Lines Mapper",
    subtitle: "GIS Visualization",
    description:
      "Visualize origin–destination passenger flows as animated arc lines on an interactive map. Upload an OD matrix CSV and explore directional movements between cities.",
    tags: ["Map", "OD Matrix", "Arc Visualization", "CSV Import"],
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7" cy="10" r="3" />
        <circle cx="25" cy="22" r="3" />
        <circle cx="7" cy="24" r="2.5" />
        <circle cx="25" cy="8" r="2.5" />
        <path d="M10 10 Q16 2 22 8" strokeOpacity="0.9" />
        <path d="M10 24 Q16 30 22 22" strokeOpacity="0.6" />
        <path d="M9.5 11.5 Q4 16 7.5 21.5" strokeOpacity="0.4" />
        <path d="M22.5 9.5 Q28 16 24.5 20.5" strokeOpacity="0.4" />
      </svg>
    ),
  },
  {
    mode: "train-processor",
    accent: "#f59e0b",
    accentBg: "bg-amber-400/10 group-hover:bg-amber-400/15",
    accentBorder: "border-amber-400/20 group-hover:border-amber-400/50",
    accentText: "text-amber-400",
    title: "Ticket Data Processor",
    subtitle: "Data Enrichment & Export",
    description:
      "Process raw rail passenger CSV data with station lookup enrichment. Add few columns, then filter and export to ready-to-use datasets.",
    tags: ["CSV", "Station Lookup", "Filter", "Export"],
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="26" height="22" rx="2" />
        <line x1="3" y1="12" x2="29" y2="12" />
        <line x1="11" y1="12" x2="11" y2="27" />
        <line x1="20" y1="12" x2="20" y2="27" />
        <line x1="3" y1="18" x2="29" y2="18" />
        <line x1="3" y1="24" x2="29" y2="24" />
        <circle cx="24" cy="8.5" r="4" fill="#f59e0b" fillOpacity="0.15" stroke="#f59e0b" />
        <line x1="24" y1="7" x2="24" y2="10" />
        <line x1="22.5" y1="8.5" x2="25.5" y2="8.5" />
      </svg>
    ),
  },
];

export default function Launcher({ onSelect }: LauncherProps) {
  return (
    <div className="h-screen w-screen bg-surface flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Subtle background grid */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(90deg, #6366f1 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Company logos */}
      <div className="flex items-center justify-center gap-6 mb-10 relative z-10">
        {[
          { src: "/dishub.ico", label: "Kementerian Perhubungan" },
          { src: "/djka.ico",   label: "DJKA" },
          { src: "/kai.ico",    label: "PT Kereta Api Indonesia" },
        ].map(({ src, label }) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img key={label} src={src} alt={label} title={label} className="w-10 h-10 object-contain opacity-80 hover:opacity-100 transition-opacity" />
        ))}
      </div>

      {/* Header */}
      <div className="text-center mb-12 relative z-10">
        <div className="flex items-center justify-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="3" cy="4" r="1.5" />
              <circle cx="13" cy="12" r="1.5" />
              <path d="M4.5 4 Q8 1 11.5 4.5" />
              <path d="M4.5 12 Q8 15 11.5 11.5" strokeOpacity="0.5" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Railway Tools</h1>
        </div>
        <p className="text-sm text-muted/70 max-w-sm">
          Select a tool to get started. Each tool is purpose-built for a specific analysis workflow.
        </p>
      </div>

      {/* Tool cards */}
      <div className="flex flex-col sm:flex-row gap-5 w-full max-w-3xl relative z-10">
        {TOOLS.map((tool) => (
          <button
            key={tool.mode}
            onClick={() => onSelect(tool.mode)}
            className={`group flex-1 text-left rounded-2xl border bg-panel p-7 transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl ${tool.accentBorder}`}
          >
            {/* Icon */}
            <div className={`w-14 h-14 rounded-xl ${tool.accentBg} border ${tool.accentBorder} flex items-center justify-center mb-5 transition-colors`}>
              {tool.icon}
            </div>

            {/* Label */}
            <div className={`text-xs font-semibold uppercase tracking-widest mb-1.5 ${tool.accentText}`}>
              {tool.subtitle}
            </div>

            {/* Title */}
            <h2 className="text-lg font-bold text-white mb-3 leading-tight">
              {tool.title}
            </h2>

            {/* Description */}
            <p className="text-sm text-muted/70 leading-relaxed mb-5">
              {tool.description}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mb-6">
              {tool.tags.map((tag) => (
                <span
                  key={tag}
                  className={`text-xs px-2 py-0.5 rounded-md border ${tool.accentBg} ${tool.accentBorder} ${tool.accentText}/80`}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* CTA */}
            <div className={`flex items-center gap-1.5 text-sm font-semibold ${tool.accentText} group-hover:gap-2.5 transition-all`}>
              Open tool
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="2" y1="7" x2="12" y2="7" />
                <polyline points="8,3 12,7 8,11" />
              </svg>
            </div>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-10 relative z-10 flex flex-col items-center gap-1.5">
        <p className="text-xs text-muted/30">More tools coming soon</p>
        <div className="flex items-center gap-2 text-xs text-muted/25">
          <span>&copy; 2026</span>
          <span className="text-muted/15">·</span>
          <a
            href="https://github.com/rizkyngrh23"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-muted/60 transition-colors"
          >
            github.com/rizkyngrh23
          </a>
          <span className="text-muted/15">·</span>
          <a
            href="https://rizkyngrh69.github.io"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-muted/60 transition-colors"
          >
            rizkyngrh69.github.io
          </a>
        </div>
      </div>
    </div>
  );
}
