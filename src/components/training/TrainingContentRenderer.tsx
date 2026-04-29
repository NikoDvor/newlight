import React from "react";
import ReactMarkdown from "react-markdown";

interface TrainingContentRendererProps {
  content: string;
}

const getText = (node: React.ReactNode): string => {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getText).join("");
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return getText(node.props.children);
  return "";
};

export function TrainingContentRenderer({ content }: TrainingContentRendererProps) {
  let ledePending = false;
  let ledeRendered = false;
  const normalizedContent = (content || "").replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n");

  return (
    <div
      className="rounded-2xl p-5 sm:p-8 shadow-[0_0_36px_hsla(211,96%,60%,.08)]"
      style={{
        background: "hsla(215,35%,10%,.8)",
        border: "1px solid hsla(211,96%,60%,.12)",
      }}
    >
      <ReactMarkdown
        components={{
          h1: ({ children }) => {
            ledePending = true;
            return (
              <div className="mb-6">
                <h1 className="mb-6 text-2xl font-bold text-white">{children}</h1>
                <div className="h-[3px] w-12 rounded-full" style={{ background: "linear-gradient(135deg, hsl(211,96%,56%), hsl(217,90%,50%))" }} />
              </div>
            );
          },
          h2: ({ children }) => (
            <h2 className="mt-8 mb-3 border-l-2 border-[hsl(211,96%,56%)] pl-3 text-lg font-semibold text-[hsl(211,96%,65%)]">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-6 mb-2 text-xs font-bold uppercase tracking-widest text-white/60">{children}</h3>
          ),
          p: ({ children }) => {
            const text = getText(children).trim();
            const isRuleCallout = /^Rule\b/i.test(text);
            const isLede = ledePending && !ledeRendered && !isRuleCallout;
            if (isLede) {
              ledeRendered = true;
              ledePending = false;
            }

            if (isRuleCallout) {
              return (
                <div className="my-4 rounded-r-xl border-l-[3px] border-[hsl(211,96%,56%)] bg-[hsla(211,96%,60%,.06)] py-3 pl-4 pr-3">
                  <p className="mb-0 flex gap-2 text-sm italic leading-relaxed text-white/80">
                    <span className="text-[hsl(var(--nl-electric))]">⚡</span>
                    <span>{children}</span>
                  </p>
                </div>
              );
            }

            return (
              <p className={isLede ? "mb-6 border-b border-[hsla(211,96%,60%,.1)] pb-6 text-base italic leading-relaxed text-white/90" : "mb-4 text-sm leading-relaxed text-white/80"}>
                {children}
              </p>
            );
          },
          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
          hr: () => <div className="my-8 h-px w-full bg-[hsla(211,96%,60%,.1)]" />,
          ol: ({ children }) => (
            <div className="my-5 space-y-2">
              {React.Children.toArray(children).map((child, index) => (
                <div key={index} className="flex items-start gap-3 rounded-xl border border-[hsla(211,96%,60%,.12)] bg-[hsla(211,96%,60%,.06)] px-4 py-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: "linear-gradient(135deg, hsl(211,96%,56%), hsl(217,90%,50%))" }}>
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1 text-sm leading-relaxed text-white/80">
                    {React.isValidElement<{ children?: React.ReactNode }>(child) ? child.props.children : child}
                  </div>
                </div>
              ))}
            </div>
          ),
          ul: ({ children }) => (
            <div className="my-4 space-y-2 pl-1">
              {React.Children.toArray(children).map((child, index) => (
                <div key={index} className="flex items-start gap-2 text-sm leading-relaxed text-white/75">
                  <span className="mt-1 text-xs text-[hsl(211,96%,56%)]">◆</span>
                  <div className="min-w-0 flex-1">
                    {React.isValidElement<{ children?: React.ReactNode }>(child) ? child.props.children : child}
                  </div>
                </div>
              ))}
            </div>
          ),
          li: ({ children }) => <>{children}</>,
          code: ({ children }) => (
            <code className="rounded-md border border-[hsla(211,96%,60%,.2)] bg-[hsla(211,96%,60%,.12)] px-2 py-0.5 font-mono text-xs text-[hsl(211,96%,75%)]">
              {children}
            </code>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-4 rounded-r-xl border-l-[3px] border-[hsl(211,96%,56%)] bg-[hsla(211,96%,60%,.06)] py-3 pl-4 pr-3">
              <div className="flex gap-2 text-sm italic leading-relaxed text-white/80">
                <span className="text-[hsl(var(--nl-electric))]">⚡</span>
                <div>{children}</div>
              </div>
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-6 w-full overflow-hidden rounded-xl border border-[hsla(211,96%,60%,.1)]">
              <table className="w-full border-collapse text-left">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-[hsla(211,96%,60%,.1)] text-[10px] font-semibold uppercase tracking-widest text-white/60">{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="border-b border-white/5 even:bg-[hsla(211,96%,60%,.02)] last:border-b-0">{children}</tr>,
          th: ({ children }) => <th className="px-4 py-3 text-left align-top">{children}</th>,
          td: ({ children }) => <td className="px-4 py-3 align-top text-sm text-white/75">{children}</td>,
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
}