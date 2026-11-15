import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAcademyBase } from "@/hooks/useAcademyBase";

const db = supabase as any;
type Term = { id: string; category: string; term: string; definition: string; usage_example: string | null; sort_order: number };

export default function AcademyGlossary() {
  const base = useAcademyBase();
  const [terms, setTerms] = useState<Term[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    db.from("nl_training_glossary_terms").select("id, category, term, definition, usage_example, sort_order").order("sort_order")
      .then(({ data }: any) => setTerms((data as Term[]) || []));
  }, []);
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? terms.filter((t) => `${t.term} ${t.definition}`.toLowerCase().includes(n)) : terms;
  }, [terms, q]);
  const cats = useMemo(() => Array.from(new Set(shown.map((t) => t.category))), [shown]);
  return (
    <div className="nl-reading mx-auto max-w-4xl space-y-4">
      <Link to={base} className="inline-flex items-center gap-1 text-[12px] text-white/55 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" />Training</Link>
      <h1 className="text-2xl font-bold text-white">Glossary</h1>
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a term"
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-[hsl(197,100%,60%)]" />
      </div>
      {cats.map((c) => (
        <section key={c} className="space-y-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(197,100%,70%)]">{c}</h2>
          {shown.filter((t) => t.category === c).map((t) => (
            <div key={t.id} className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
              <div className="text-[14px] font-semibold text-white">{t.term}</div>
              <p className="mt-0.5 text-[13px] text-white/75">{t.definition}</p>
              {t.usage_example && <p className="mt-1 text-[12px] italic text-white/45">{t.usage_example}</p>}
            </div>
          ))}
        </section>
      ))}
      {!shown.length && <p className="text-sm text-white/50">No matching terms.</p>}
    </div>
  );
}
