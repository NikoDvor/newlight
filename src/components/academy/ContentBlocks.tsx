import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Eye } from "lucide-react";
import { Visual } from "./visuals";

/**
 * Training content markup (Markdown plus a few training-only lines):
 *   ---              new slide
 *   [[visual:key]]   interactive visual (see visuals.tsx)
 *   !! text          highlight callout
 *   ?? Q || A        tap-to-reveal card
 *   | a | b |        table → stacked rows (readable on phones)
 */

type Block =
  | { kind: "md"; text: string }
  | { kind: "visual"; key: string }
  | { kind: "callout"; text: string }
  | { kind: "reveal"; q: string; a: string }
  | { kind: "table"; head: string[]; rows: string[][] };

function normalize(content: string) {
  return (content || "").replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r\n/g, "\n").trim();
}

/** Split a chapter into slides. Older chapters without --- are split at their ## headings. */
export function toSlides(content: string): string[] {
  const c = normalize(content);
  let slides = c.split(/\n\s*---+\s*\n/).map((s) => s.trim()).filter(Boolean);
  if (slides.length === 1 && (c.match(/\n## /g) || []).length >= 2) {
    const parts = c.split(/\n(?=## )/);
    slides = parts.map((s) => s.trim()).filter(Boolean);
  }
  return slides.length ? slides : [""];
}

const cells = (line: string) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((x) => x.trim());

function parse(slide: string): Block[] {
  const out: Block[] = [];
  const lines = slide.split("\n");
  let md: string[] = [];
  const flush = () => { if (md.join("").trim()) out.push({ kind: "md", text: md.join("\n") }); md = []; };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    const vis = t.match(/^\[\[visual:([a-z0-9-]+)\]\]$/i);
    if (vis) { flush(); out.push({ kind: "visual", key: vis[1] }); continue; }
    if (t.startsWith("!! ")) { flush(); out.push({ kind: "callout", text: t.slice(3) }); continue; }
    if (t.startsWith("?? ") && t.includes("||")) {
      flush();
      const [q, a] = t.slice(3).split("||");
      out.push({ kind: "reveal", q: q.trim(), a: (a || "").trim() });
      continue;
    }
    if (t.startsWith("|") && lines[i + 1]?.trim().match(/^\|?\s*:?-{2,}/)) {
      flush();
      const head = cells(t);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) { rows.push(cells(lines[i])); i++; }
      i--;
      out.push({ kind: "table", head, rows });
      continue;
    }
    md.push(line);
  }
  flush();
  return out;
}

const Inline = ({ text }: { text: string }) => (
  <ReactMarkdown components={{ p: ({ children }) => <>{children}</>, strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong> }}>{text}</ReactMarkdown>
);

function Reveal({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button type="button" onClick={() => setOpen(!open)}
      className="my-4 block w-full rounded-xl border border-[hsla(262,85%,74%,.3)] bg-[hsla(262,85%,74%,.06)] p-4 text-left">
      <div className="flex items-start gap-2.5">
        <Eye className="h-4 w-4 mt-0.5 shrink-0 text-[hsl(262,85%,78%)]" />
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-white"><Inline text={q} /></div>
          <AnimatePresence initial={false}>
            {open ? (
              <motion.div key="a" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <p className="pt-2 text-[14px] leading-relaxed text-white/80"><Inline text={a} /></p>
              </motion.div>
            ) : (
              <motion.div key="h" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-1 text-[11px] uppercase tracking-wider text-[hsl(262,85%,78%)]/80">Tap to reveal</motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </button>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="my-4 space-y-1.5">
      {head.length > 1 && (
        <div className="hidden sm:flex px-3 text-[10px] uppercase tracking-wider text-white/35">
          <span className="flex-1"><Inline text={head[0]} /></span><span><Inline text={head.slice(1).join(" · ")} /></span>
        </div>
      )}
      {rows.map((r, i) => (
        <motion.div key={i} initial={{ opacity: 0, x: -6 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
          className="flex flex-col gap-0.5 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="text-[13px] text-white/85 sm:flex-1"><Inline text={r[0] || ""} /></div>
          <div className="text-[13px] font-semibold text-[hsl(197,100%,68%)] sm:text-right sm:max-w-[50%]">
            {r.slice(1).map((c, k) => <span key={k}>{k > 0 && " · "}<Inline text={c} /></span>)}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

const md = {
  h1: ({ children }: { children?: ReactNode }) => (
    <h1 className="mb-4 text-[26px] sm:text-3xl font-bold leading-tight text-white">
      {children}
      <span className="mt-3 block h-[2px] w-14 rounded-full" style={{ background: "linear-gradient(90deg, hsl(211,96%,56%), hsl(197,100%,58%))", boxShadow: "0 0 10px hsla(197,100%,55%,.7)" }} />
    </h1>
  ),
  h2: ({ children }: { children?: ReactNode }) => <h2 className="mt-6 mb-2.5 text-[19px] font-semibold text-white">{children}</h2>,
  h3: ({ children }: { children?: ReactNode }) => <h3 className="mt-5 mb-2 text-[15px] font-semibold text-[hsl(197,100%,68%)]">{children}</h3>,
  p: ({ children }: { children?: ReactNode }) => <p className="my-3 text-[15px] leading-relaxed text-white/80">{children}</p>,
  strong: ({ children }: { children?: ReactNode }) => <strong className="font-semibold text-white">{children}</strong>,
  em: ({ children }: { children?: ReactNode }) => <em className="text-white/60">{children}</em>,
  ul: ({ children }: { children?: ReactNode }) => <ul className="my-3 space-y-2">{children}</ul>,
  ol: ({ children }: { children?: ReactNode }) => <ol className="my-3 space-y-2 list-none [counter-reset:nl]">{children}</ol>,
  li: ({ children }: { children?: ReactNode }) => (
    <li className="relative pl-5 text-[15px] leading-relaxed text-white/80">
      <span aria-hidden className="absolute left-0 top-[0.72em] h-px w-3 bg-[hsl(197,100%,60%)]" />
      {children}
    </li>
  ),
  blockquote: ({ children }: { children?: ReactNode }) => (
    <blockquote className="my-4 border-l-2 border-[hsl(197,100%,58%)] bg-[hsla(197,100%,55%,.06)] py-2 pl-4 pr-3 rounded-r-lg [&_p]:my-1 [&_p]:text-white [&_p]:text-[15px] [&_p]:italic">{children}</blockquote>
  ),
  a: ({ children, href }: { children?: ReactNode; href?: string }) => <a href={href} className="text-[hsl(197,100%,65%)] underline">{children}</a>,
  hr: () => <div className="my-5 h-px bg-white/10" />,
  code: ({ children }: { children?: ReactNode }) => <code className="rounded bg-white/10 px-1 py-0.5 text-[13px]">{children}</code>,
};

export function SlideBody({ slide }: { slide: string }) {
  const blocks = parse(slide);
  return (
    <div>
      {blocks.map((b, i) => {
        switch (b.kind) {
          case "md": return <ReactMarkdown key={i} components={md as any}>{b.text}</ReactMarkdown>;
          case "visual": return <Visual key={i} name={b.key} />;
          case "callout":
            return (
              <div key={i} className="my-4 flex gap-2.5 rounded-xl border border-[hsla(197,100%,55%,.35)] bg-[hsla(197,100%,55%,.08)] px-4 py-3">
                <Zap className="h-4 w-4 mt-0.5 shrink-0 text-[hsl(197,100%,62%)]" />
                <div className="text-[14px] leading-relaxed text-white"><Inline text={b.text} /></div>
              </div>
            );
          case "reveal": return <Reveal key={i} q={b.q} a={b.a} />;
          case "table": return <Table key={i} head={b.head} rows={b.rows} />;
        }
      })}
    </div>
  );
}
