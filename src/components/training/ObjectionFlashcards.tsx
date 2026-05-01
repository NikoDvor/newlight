import { useState } from "react";
import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";

export interface FlashcardData {
  front: string;
  back: string;
}

interface ObjectionFlashcardsProps {
  cards: FlashcardData[];
}

function Flashcard({ front, back }: FlashcardData) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="relative w-full cursor-pointer"
      style={{ perspective: "900px", minHeight: 180 }}
      onClick={() => setFlipped((f) => !f)}
    >
      <motion.div
        className="relative w-full"
        style={{ transformStyle: "preserve-3d", minHeight: 180 }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 rounded-2xl border px-5 py-6 flex flex-col justify-center"
          style={{
            backfaceVisibility: "hidden",
            background: "hsla(215,35%,10%,.8)",
            borderColor: "hsla(211,96%,60%,.25)",
            boxShadow: "0 0 24px -8px hsla(211,96%,60%,.12)",
          }}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest text-[hsl(211,96%,65%)] mb-3">
            Objection
          </span>
          <p className="text-sm sm:text-base font-medium text-white/90 leading-relaxed">
            {front}
          </p>
          <span className="mt-4 text-[10px] text-white/40 italic">Tap to reveal</span>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 rounded-2xl border px-5 py-6 flex flex-col justify-center"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: "hsla(215,35%,10%,.8)",
            borderColor: "hsla(211,96%,60%,.25)",
            boxShadow: "0 0 24px -8px hsla(211,96%,60%,.12)",
          }}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest text-[hsl(152,60%,50%)] mb-3">
            Response
          </span>
          <p className="text-sm text-white/85 leading-relaxed">{back}</p>
          <span className="mt-4 text-[10px] text-white/40 italic">Tap to flip back</span>
        </div>
      </motion.div>
    </div>
  );
}

export function ObjectionFlashcards({ cards }: ObjectionFlashcardsProps) {
  const [resetKey, setResetKey] = useState(0);

  if (!cards || cards.length === 0) return null;

  return (
    <div className="mt-8">
      <div
        className="rounded-2xl p-5 sm:p-8"
        style={{
          background: "hsla(215,35%,10%,.6)",
          border: "1px solid hsla(211,96%,60%,.12)",
          boxShadow: "0 0 36px hsla(211,96%,60%,.06)",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-semibold text-white">Flashcards</h3>
            <p className="text-xs text-white/50 mt-0.5">
              Tap each card to reveal the answer
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setResetKey((k) => k + 1);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/60 hover:text-white/80 transition-colors"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>
        <div key={resetKey} className="grid gap-4 sm:grid-cols-2">
          {cards.map((card, i) => (
            <Flashcard key={i} front={card.front} back={card.back} />
          ))}
        </div>
      </div>
    </div>
  );
}
