interface Props {
  title: string;
  items: string[];
}

export function ActivationHelp({ title, items }: Props) {
  return (
    <div className="rounded-lg p-3 mb-3" style={{ background: "hsla(211,96%,60%,.04)", border: "1px solid hsla(211,96%,60%,.08)" }}>
      <p className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-1.5">{title}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-[11px] text-white/40 flex items-start gap-1.5">
            <span className="text-[hsl(var(--nl-sky))]">•</span>{item}
          </li>
        ))}
      </ul>
    </div>
  );
}
