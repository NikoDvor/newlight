import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, BookOpen, CheckCircle2, XCircle, Trophy, Clock, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { ScriptDrillExercise, ScriptDrillLine } from "@/components/training/ScriptDrillExercise";
import { TrainingContentRenderer } from "@/components/training/TrainingContentRenderer";
import { PracticeRecordingVault } from "@/components/training/PracticeRecordingVault";
import { ObjectionFlashcards, FlashcardData } from "@/components/training/ObjectionFlashcards";

export interface QuestionRow {
  id: string;
  chapter_id: string | null;
  module_id: string;
  question_type: string;
  question_text: string;
  options: string[];
  correct_index: number;
  explanation: string;
  quiz_level?: number;
}

export interface ChapterRow {
  id: string;
  chapter_number: number;
  chapter_title: string;
  content: string | null;
  module_id: string;
}

type Phase = "reading" | "drill" | "quiz" | "result";
type QuizLevel = 1 | 2 | 3;

const SCRIPT_DRILLS: Record<string, ScriptDrillLine[]> = {
  "5.1": [
    { prompt: "RAPPORT:", answer: "Build rapport first. Comment on the business, the vibe, something real and genuine." },
    { prompt: "OPENER:", answer: "Hey, quick question — if I lined up 25 new [customers/clients] for you next month, could you handle them?" },
    { prompt: "SILENCE RULE:", answer: "Let them respond. Don't fill the silence." },
    { prompt: "HOOK:", answer: "Here's what I mean — right now there are people in [city] searching for exactly what you offer. They're just finding your competition first. What we do is flip that. We make sure those people find you instead and come through your door." },
    { prompt: "REVEAL SETUP:", answer: "And honestly — I already put something together for you specifically." },
    { prompt: "REVEAL:", answer: "This is a system I built for your business. It organizes everything on the backend and opens up revenue you're probably sitting on right now but can't see yet. Give me 5 minutes and I'll walk you through it." },
    { prompt: "APP TIP:", answer: "It shows you exactly where your business is bleeding money and what to do about it." },
  ],
  "5.2": [
    { prompt: "STEP 1 — OWNER CONFIRM:", answer: "Hey, is this the owner?" },
    { prompt: "STEP 2 — OPENER:", answer: "Quick question — if I could line up 25 new [customers] for you next month, would you have the capacity to take them on?" },
    { prompt: "STEP 3 — HOOK:", answer: "So the way we do it — there are people in your area searching for [their service] right now, and they're landing on your competition's page. We redirect that traffic to you instead." },
    { prompt: "STEP 4 — REVEAL:", answer: "I actually spent time building something out for your business specifically. Do you mind if I send it over?" },
    { prompt: "WAIT RULE:", answer: "Wait for yes." },
    { prompt: "STEP 5 — BOOK:", answer: "I'd love just 20 minutes to walk you through it. Do mornings, afternoons, or evenings work better for you this week?" },
    { prompt: "CALENDAR RULE:", answer: "Perfect. I'll send you a calendar link right now while we're on the phone." },
    { prompt: "SHOW RATE RULE:", answer: "Do not hang up without a booked slot. Show rate drops significantly without this." },
  ],
};

const CHAPTER_FLASHCARDS: Record<string, FlashcardData[]> = {
  "5.1": [
    { front: "What does an objection actually signal?", back: "Something specific is unresolved — not a rejection of you, a signal that belief has not been transferred yet. Find what is unresolved and address it." },
    { front: "'Too expensive,' 'need to think,' 'don't see the value' — how many root causes?", back: "One. All three mean the prospect cannot yet see that the return justifies the cost. Fix the belief, not the surface wording." },
    { front: "What is the rule before any rebuttal?", back: "Acknowledge first — then dig. Never defend before you understand what is actually going on. Curiosity before counter-argument, every time." },
    { front: "What is RAC?", back: "Recognize the objection without defending. Ask one clarifying question to get underneath it. Close forward once the real concern is addressed." },
    { front: "When do you qualify out?", back: "When the same objection has come up twice, there is no real budget window, and the prospect gives nothing back when you probe. A fast no is worth more than a three-week maybe." },
  ],
  "5.2": [
    { front: "What is the default opener with every gatekeeper?", back: "The Confident Ask — 'Hey, is [owner name] around?' Say the name if you have it. Do not over-explain. Do not pitch. Just ask with the energy of someone who belongs there." },
    { front: "They ask 'What's this about?' — what do you say?", back: "The Purpose Statement — 'I put something together for the business, I just wanted to show it to [owner name] real quick.' Specific enough to be real. Creates curiosity. Does not pitch." },
    { front: "What is the Ally Frame technique?", back: "'Maybe you can help me — I wanted to get something in front of [owner name]. Is there a good time when they are not slammed?' You gave them a role. People help when they feel respected and useful." },
    { front: "The owner is not there. What do you do before you leave?", back: "The Return Visit Setup — 'When is the best time to catch them? And what's your name? I'll ask for you when I come back.' You created continuity. You are not a stranger on your return." },
    { front: "On a cold call, they ask who is calling — what do you say?", back: "'This is [your name] — I had something I wanted to run by them real quick.' Not a company name. Not a pitch. Your name and one vague but real purpose." },
    { front: "They ask you to leave a voicemail — what makes yours get returned?", back: "Make it specific — 'I was looking at your business online and I noticed something I wanted to flag. Takes two minutes.' A specific observation gets returned. A generic pitch does not." },
  ],
  "5.3": [
    { front: "'Not interested' — what is actually happening?", back: "Autopilot. A conditioned reflex that fires before they have processed what you said. It is not a decision — it is a pattern. Interrupt the pattern, do not overcome the decision." },
    { front: "'I don't see the value' — what went wrong?", back: "The pitch connected to your service, not their specific problem. They heard what you do. They did not feel why it matters to them. Stop pitching. Start finding the pain they have not named." },
    { front: "Pattern Interrupt response to 'not interested'", back: "'[Name], can I be straight with you for 20 seconds?' Most say yes. Then ask what is actually going on — not to re-pitch. You broke their autopilot script with an unexpected question." },
    { front: "Temperature Check — how does it work?", back: "'On a scale of 1 to 10 — where are you honestly?' Under 5: 'What would move you to a 5?' 5-6: 'What would move you to an 8?' 7+: close. Converts a vague dismissal into a specific conversation." },
    { front: "The Funnel response to 'I don't see the value'", back: "'If we delivered [specific outcome], what about that would you regret?' Moves them from 'I don't see value' to 'I don't believe you can execute' — now handle it with proof, not more pitch." },
    { front: "Surface the Gap response", back: "'Where do you want to be in six months, and is what you have now going to get you there?' If a gap exists — that gap is the value." },
  ],
  "5.4": [
    { front: "'I need to think about it' — what does it actually mean?", back: "Something specific is unresolved and the prospect does not feel safe naming it directly. They are not going to think about it. Find what is underneath it before they leave the conversation." },
    { front: "Reframe What Thinking Requires", back: "'Decisions do not take time — they take information. The longer we wait, the less you have. What are your main concerns so I can address them?' You turned a time problem into an information problem you can solve right now." },
    { front: "Give Three Options response", back: "'Is it more about the timing, the investment, or something about what we discussed that does not feel right?' Give three options — people pick one. Now you have a real conversation instead of a follow-up black hole." },
    { front: "The Compounding Gap response", back: "'Every month you are not running this, businesses in your market are pulling further ahead. The gap compounds while you think. What would you need to see to move forward now?' Real urgency — not a fake deadline." },
    { front: "'I need to talk to someone' — The Ally Close", back: "'What would you do if they said no?' If they would still go ahead — close. If not — surface why the decision-maker would be opposed and address each concern before scheduling everyone together." },
    { front: "Arm Them for the Internal Sale", back: "'When you bring this to them, what objection do you think they will have? I would rather handle that together now than have it come up when I am not in the room.' Surface the real objection before it kills the deal." },
  ],
  "5.5": [
    { front: "'Too expensive' — what is the real objection?", back: "They can see the cost but not the return. It is not a budget problem — it is a value problem. Do not lower the price. Raise the perceived value until the price feels small." },
    { front: "Reframe Cost vs. Revenue", back: "'Is it the price itself, or is it expensive compared to where you are right now? If you are leaving revenue on the table each month, which is actually more expensive?' You gave inaction a price tag." },
    { front: "Do the Math Together", back: "'What is your average customer value? If we brought you 2-3 of those this month, would the investment make sense?' Their numbers move them — your numbers do not. Let them calculate the return." },
    { front: "Separate Desire from Budget", back: "'Setting money aside — if results were guaranteed, is this something you would want?' Yes = structure problem, solve the structure. No = they do not want the outcome yet, return to discovery." },
    { front: "'What's your pricing?' — what do you do?", back: "Redirect to outcome first. 'It depends on what you are looking for — we might not even be the right fit yet. What have you been trying to solve?' A number without context anchors on cost not value." },
    { front: "'Your competitor is cheaper' — first response", back: "'Cheaper is only better if you get the same result. What results have they shown you they can get for a business like yours?' Let it sit. If they cannot answer — the comparison collapses." },
    { front: "They push for a price twice — what do you say?", back: "'Most clients in your situation invest between [X] and [Y] and typically see [Z] in return within [timeframe]. But let me show you what that looks like for your business specifically.' Range tied to outcome." },
  ],
  "5.6": [
    { front: "'We tried it before and it didn't work' — what do you do first?", back: "Diagnose before you defend — 'What did you try and what actually happened?' Listen for: bad agency, wrong platform, poor targeting, no follow-up, unrealistic timeline. Each has a different fix. Never defend until you know which part failed." },
    { front: "After diagnosing a bad experience — how do you respond?", back: "'The reason it did not work was not the channel — it was [specific issue]. Here is what we do differently: [specific process]. Here is a client in the same position: [specific result].' Proof of process difference — not 'we are different.'" },
    { front: "'We already have someone' — what is your first move?", back: "'How is that going? What are they focused on and what results are you seeing?' Listen for gaps in volume, quality, speed, or channels not covered. Those gaps are your opening — not your pitch." },
    { front: "The Gap Question for 'already have someone' or 'in-house team'", back: "'What is your current setup currently not doing that you wish it were?' If they name a gap they own the need. That need is your opening. Let them name it — never name it for them." },
    { front: "'We handle it in-house' — how do you position without threatening their team?", back: "Position as complementary — 'We are not replacing your team. We give them the paid infrastructure that takes too long to build from scratch. Their work becomes more effective, not redundant.'" },
    { front: "Reframe the Channel response to bad experience", back: "'If the ads had been set up correctly and leads followed up properly — do you think it could have worked?' If yes: the issue was execution not the channel. You are the execution they did not get before." },
    { front: "The Pattern Recognition Advantage", back: "'An in-house hire gives you one person's experience. We bring a team tested across hundreds of campaigns. You cannot build that pattern recognition in-house without years and experiments your competitors have already run.'" },
  ],
  "5.7": [
    { front: "A prospect throws three objections at once — what do you do?", back: "'I heard a few things — let me address the most important one first. Which of those is the biggest concern right now?' Pick the one they name, resolve it fully, then ask if the others are still relevant. One at a time." },
    { front: "You resolved an objection — what do you do immediately?", back: "Move forward — do not pause and wait for an invitation. 'So the next step is simple — are mornings or afternoons better for you this week?' You resolved it. You move. Pausing is where deals die." },
    { front: "How do you tell a pattern objection from a genuine concern?", back: "Pattern: comes before you said enough to give real concerns, same words every time, does not change when addressed. Genuine: specific language, questions that show processing, concern about something specific you presented." },
    { front: "Temperature Check — what does each range mean?", back: "1-3: Pattern objection — break the pattern before addressing content. 4-6: Genuine concern — ask what would move them up. 7-9: Ready — stop objection handling and close. 10: Close immediately." },
    { front: "The Funnelling Technique", back: "Move a hard objection into an easier related one. 'I don't see value' → 'If we delivered [outcome], what would you regret?' You moved from vague and hard to specific and addressable with proof." },
    { front: "When do you qualify out and how?", back: "Same objection twice with nothing new, no real budget path, every probe gets a deflection. Exit clean: 'This might not be the right moment — if things change I would be glad to come back. Is there a better time of year to keep in mind?'" },
  ],
  "5.8": [
    { front: "WALL — Gatekeeper: 'What's this about?'", back: "Root: Protecting owner's time — their job. Key line: 'I put something together for the business — I just wanted to show [owner name] real quick.' Specific enough to be real. Creates curiosity without pitching." },
    { front: "AUTOPILOT — 'Not interested' / 'We're good'", back: "Root: Conditioned reflex — fires before processing. Key line: '[Name], can I be straight with you for 20 seconds?' Breaks the pattern. Then ask what is actually going on — do not re-pitch." },
    { front: "STALL — 'I need to think about it' / 'Call me back'", back: "Root: Something specific is unresolved. They will not think about it — they will forget you. Key line: 'Decisions do not take time — they take information. What are your main concerns so I can address them now?'" },
    { front: "ACCESS — 'I need to run it by my partner/manager'", back: "Root: Unresolved concern using another person as cover OR genuinely needs buy-in. Key line: 'What would you do if they said no?' Then either close or surface what the decision-maker would object to and address it." },
    { front: "VALUE GAP — 'I don't see the value' / 'We're doing fine'", back: "Root: Pitch connected to your service not their specific problem. Key line: 'Where do you want to be in six months, and is what you have now going to get you there?' The gap is the value." },
    { front: "COST — 'Too expensive' / 'Not in the budget'", back: "Root: Can see the cost but not the return. Key line: 'What is your average customer value? If we brought you two or three of those this month — would the investment make sense?' Their math moves them." },
    { front: "COST — 'What's your pricing?' / 'Just tell me the price'", back: "Root: Anchoring on cost before value is established. Key line: 'It depends on what you are looking for — we might not even be the right fit yet. What have you been trying to solve?' Redirect to fit and outcome." },
    { front: "COST — 'Your competitor is cheaper'", back: "Root: Price comparison without value comparison. Key line: 'Cheaper is only better if you get the same result. What results have they shown you they can get for a business like yours?' Let the comparison collapse." },
    { front: "TRUST DEFICIT — 'We tried it before and it didn't work'", back: "Root: Previous bad experience destroyed trust in the category. Key line: 'What did you try and what actually happened?' Diagnose before you defend. Never defend marketing before you know which part failed." },
    { front: "TRUST DEFICIT — 'Can you guarantee results?'", back: "Root: Fear of wasting money from a previous bad experience. Key line: 'Anyone who guarantees a specific number is not being straight with you. What we guarantee is the process — let me show you what that process has produced.'" },
    { front: "STATUS QUO — 'We already have someone' / 'We handle it in-house'", back: "Root: Comfort with current state. Change feels risky. Key line: 'What is your current setup currently not doing that you wish it were?' If they name the gap, they own the need." },
    { front: "PROOF DEMAND — 'Show me results' / 'What have you done for similar businesses'", back: "Root: Need specific evidence before trust is extended. Key line: 'What kind of business do you consider similar to yours? I want to show you something actually comparable — not a generic case study.' Pull specific proof immediately." },
    { front: "STACKED — Multiple objections at once", back: "Root: One real concern surrounded by supporting noise. Key line: 'I heard a few things — which of those is the biggest concern right now?' Pick one. Resolve it fully. Most of the time the rest dissolve." },
    { front: "CAPACITY CONCERN — 'We're too busy right now'", back: "Root: Timing stall or genuine capacity issue. Key line: 'The businesses pulling ahead are the ones who systematize their growth during their busy seasons, not after. When does your busy season end?'" },
    { front: "GENERIC SKEPTICISM — 'These things never work for businesses like mine'", back: "Root: Lack of relevant proof or identification. Key line: 'What kind of business do you consider similar to yours? I want to show you a result that is actually comparable.' Pull specific proof immediately after." },
  ],
  "6.1": [
    { front: "What is the single biggest mistake bad closers make?", back: "They give the prospect every opportunity to say no — permission-seeking language, softening after the ask, over-explaining. Every phrase protects the rep from rejection while signaling uncertainty to the prospect." },
    { front: "What tonality must you use when closing and why?", back: "Downward or flat — declarative, certain, calm. A rising close sounds like you are unsure whether they want to meet. The close is not a question. It is the statement of the next step." },
    { front: "What are the 4 separators of elite closers?", back: "1. They do not need the yes. 2. They close early and often with trial closes. 3. They protect the silence after the ask. 4. Their language always assumes the outcome — 'when' not 'if.'" },
    { front: "When does the close actually start?", back: "At the first second of the conversation. Elite closers do not have a closing moment — they have a conversation that was always moving toward one direction. The ask is just the natural conclusion." },
    { front: "What is the pre-close mindset reset?", back: "Ask yourself: Am I stating the next step or asking permission? Is my tonality going down? Am I ready to be silent? Do I believe this is right for them? If no on any — reset before asking." },
  ],
  "6.2": [
    { front: "What psychological shift does the Option Close create?", back: "It moves the prospect from evaluating WHETHER to meet to deciding WHICH time — the decision to meet is already made, they are just handling logistics. Both options answer in your favor." },
    { front: "Option Close — correct delivery", back: "'Let me grab a time — mornings or afternoons better for you this week?' One sentence. Downward tonality. Immediate silence. No build-up, no softening, no permission-seeking." },
    { front: "What is the Urgency Anchor variation?", back: "'I have something Tuesday morning or Thursday afternoon — which of those works?' Two specific real times. Specificity creates faster decisions than open availability." },
    { front: "What do you do the moment they pick an option?", back: "Move immediately — 'Perfect — what's the best number to send the calendar link to?' Do not celebrate. Do not re-explain. Lock in the booking before the conversation continues." },
    { front: "What are the 4 most common Option Close mistakes?", back: "1. Offering 3+ options — creates paralysis. 2. Softening before the ask. 3. Not sending the calendar link immediately. 4. Rising tonality that turns the close into a question." },
  ],
  "6.3": [
    { front: "What is the Assignment Close and how does it differ from a standard close?", back: "Instead of asking for a commitment, you give the prospect a specific immediate task — 'pull up your calendar right now.' The act of doing the task IS the close. Actions are easier than decisions." },
    { front: "Assignment Close — correct delivery", back: "'Pull up your calendar — let's find a time before I leave.' Specific, immediate, directive. The word 'now' or 'before I leave' prevents deferral. You are leading, not requesting." },
    { front: "What is the full Assignment Close sequence?", back: "1. Positive signal. 2. 'Pull up your calendar right now.' 3. They open it. 4. Name two times. 5. They pick one. 6. Send the link immediately. 7. Confirm it landed. Booking only exists after step 6." },
    { front: "Assignment Close on a cold call", back: "'While I have you — pull up your calendar right now and let's lock something in before we hang up.' Send the link during the call. Confirm receipt. Every step completed together is a step they will not skip later." },
    { front: "What makes assignment closers feel helpful rather than pushy?", back: "The frame: 'I want to make this easy for you right now so you do not have to deal with scheduling later.' Said with calm confidence it feels like the natural next step — not a demand." },
  ],
  "6.4": [
    { front: "What is the core psychology behind the Bandwagon Close?", back: "People do not want to be first. Showing others like them already said yes removes fear and gives permission to move." },
    { front: "What makes social proof weak vs. strong?", back: "Weak: 'We work with a lot of businesses.' Strong: specific niche, specific city, specific result." },
    { front: "What is the full Bandwagon Close sequence?", back: "'We are already working with [number] [niche] businesses in [city]. They are seeing [result]. You would be next. Does mornings or afternoons work better for you this week?'" },
    { front: "When do you deploy the Bandwagon Close?", back: "After value is established — when interested but hesitant. Never as an opener." },
    { front: "What tonality do you use?", back: "Calm and flat — stated as fact. Calm signals this is normal and expected." },
  ],
  "6.5": [
    { front: "What is a buying signal?", back: "Any sign the prospect moved from evaluating to deciding — thinking 'how does this work for me' instead of 'should I do this.'" },
    { front: "What do you do the moment you see a buying signal?", back: "Stop pitching. Close immediately. Every extra word gives them time to talk themselves out of it." },
    { front: "What does silence after the close mean and what do you do?", back: "Silence is processing. Hold it. Say nothing. The next person to speak concedes." },
    { front: "What is over-pitching and why does it kill deals?", back: "Continuing to pitch after the prospect is already sold. Introduces doubt and kills momentum." },
    { front: "Name three buying signals on a cold call.", back: "Tone shifts warmer, pace slows, prospect starts asking questions instead of deflecting." },
  ],
  "6.6": [
    { front: "What does 'let me think about it' after the close mean?", back: "Something specific is unresolved. Not a no — an unexpressed concern. Surface it." },
    { front: "What is the difference between a stall and an objection?", back: "Objection is before the ask — about the pitch. Stall is after the ask — about the decision." },
    { front: "What is the RAC framework at the close?", back: "Recognize without defending. Ask one clarifying question underneath. Close forward once the real concern is addressed." },
    { front: "What do you say when the stall is vague?", back: "'Most people who say that never actually move forward — and I do not want that for you. What would need to be true for you to feel good about this today?'" },
    { front: "What must you lock before leaving a prospect who will not commit today?", back: "A specific date, time, and method — then send confirmation immediately. Never leave open-ended." },
  ],
};

interface LevelProgressRow {
  quiz_level: QuizLevel;
  status: string;
  score: number | null;
}

interface Props {
  mode: "chapter" | "module_test";
  chapter?: ChapterRow;
  moduleId: string;
  trackId: string;
  passScore?: number;
  lockedPreview?: boolean;
  unlockModuleNumber?: number;
  onClose: () => void;
  onCompleted: () => void;
}

const LEVEL_LABELS: Record<QuizLevel, string> = {
  1: "Foundation",
  2: "Application",
  3: "Mastery",
};

export function ChapterRunner({
  mode,
  chapter,
  moduleId,
  trackId,
  passScore = 70,
  lockedPreview = false,
  unlockModuleNumber,
  onClose,
  onCompleted,
}: Props) {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [levelProgress, setLevelProgress] = useState<LevelProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>(mode === "chapter" ? "reading" : "quiz");
  const [currentLevel, setCurrentLevel] = useState<QuizLevel>(1);
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [lastScorePct, setLastScorePct] = useState(0);
  const [lastPassed, setLastPassed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [moduleNumber, setModuleNumber] = useState<number | null>(null);
  const [drillCompleted, setDrillCompleted] = useState(false);
  const drillKey = mode === "chapter" && moduleNumber === 5 && chapter ? `5.${chapter.chapter_number}` : "";
  const drillLines = SCRIPT_DRILLS[drillKey] || [];
  const requiresDrill = drillLines.length > 0;
  const flashcardKey = mode === "chapter" && (moduleNumber === 5 || moduleNumber === 6) && chapter ? `${moduleNumber}.${chapter.chapter_number}` : "";
  const flashcards = CHAPTER_FLASHCARDS[flashcardKey] || [];

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setPhase(mode === "chapter" ? "reading" : "quiz");
      setCurrentLevel(1);
      setQIdx(0);
      setSelected(null);
      setRevealed(false);
      setCorrectCount(0);

      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      const { data: moduleRow } = await supabase
        .from("nl_training_modules")
        .select("module_number")
        .eq("id", moduleId)
        .maybeSingle();
      setModuleNumber(moduleRow?.module_number ?? null);

      let q;
      if (mode === "chapter" && chapter) {
        q = await supabase
          .from("nl_training_questions")
          .select("*")
          .eq("chapter_id", chapter.id)
          .eq("question_type", "chapter_quiz")
          .order("quiz_level", { ascending: true } as any)
          .order("created_at", { ascending: true });
      } else {
        q = await supabase
          .from("nl_training_questions")
          .select("*")
          .eq("module_id", moduleId)
          .eq("question_type", "module_test")
          .is("chapter_id", null)
          .order("created_at");
      }

      const rows = (q.data || []).map((r: any) => ({
        ...r,
        quiz_level: (r.quiz_level || 1) as QuizLevel,
        options: Array.isArray(r.options) ? r.options : (typeof r.options === "string" ? JSON.parse(r.options) : []),
      })) as QuestionRow[];
      setQuestions(rows);

      if (user && mode === "chapter" && chapter) {
        const { data: levels } = await (supabase as any)
          .from("nl_training_chapter_level_progress")
          .select("quiz_level, status, score")
          .eq("user_id", user.id)
          .eq("chapter_id", chapter.id);
        const levelRows = (levels || []) as LevelProgressRow[];
        setLevelProgress(levelRows);
        const { data: drillRows } = await (supabase as any)
          .from("nl_training_progress")
          .select("status")
          .eq("user_id", user.id)
          .eq("module_id", moduleId)
          .eq("chapter_id", chapter.id)
          .eq("status", "drill_completed")
          .limit(1);
        setDrillCompleted((drillRows || []).length > 0);
        const nextLevel = ([1, 2, 3] as QuizLevel[]).find(
          (level) => !levelRows.some((row) => row.quiz_level === level && row.status === "completed")
        ) || 3;
        setCurrentLevel(nextLevel);
      }

      if (user && !lockedPreview) {
        const { data: existingProgress } = await supabase
          .from("nl_training_progress")
          .select("status")
          .eq("user_id", user.id)
          .eq("module_id", moduleId)
          .eq("chapter_id", mode === "chapter" && chapter ? chapter.id : null)
          .maybeSingle();
        if (!existingProgress || !["completed", "drill_completed"].includes(existingProgress.status)) {
          await supabase.from("nl_training_progress").upsert(
          {
            user_id: user.id,
            track_id: trackId,
            module_id: moduleId,
            chapter_id: mode === "chapter" && chapter ? chapter.id : null,
            status: "in_progress",
            last_attempt_at: new Date().toISOString(),
          },
          { onConflict: "user_id,module_id,chapter_id" } as any
          );
        }
      }
      setLoading(false);
    };
    load();
  }, [mode, chapter?.id, moduleId, trackId, lockedPreview]);

  const currentLevelQuestions = useMemo(
    () => mode === "chapter" ? questions.filter((q) => (q.quiz_level || 1) === currentLevel).slice(0, 3) : questions,
    [currentLevel, mode, questions]
  );
  const current = currentLevelQuestions[qIdx];
  const totalQ = currentLevelQuestions.length;
  const scorePct = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
  const passed = mode === "chapter" ? lastPassed : scorePct >= passScore;

  const isLevelComplete = (level: QuizLevel) => levelProgress.some((row) => row.quiz_level === level && row.status === "completed");
  const isLevelUnlocked = (level: QuizLevel) => level === 1 || isLevelComplete((level - 1) as QuizLevel);
  const completedLevels = ([1, 2, 3] as QuizLevel[]).filter(isLevelComplete).length;
  const showPracticeVault = mode === "chapter" && !!chapter && moduleNumber !== null && [3, 4, 5, 6].includes(moduleNumber);

  const resetQuiz = (level = currentLevel) => {
    if (lockedPreview) return;
    setCurrentLevel(level);
    setQIdx(0);
    setSelected(null);
    setRevealed(false);
    setCorrectCount(0);
    setLastScorePct(0);
    setLastPassed(false);
    setPhase(requiresDrill && !drillCompleted ? "drill" : "quiz");
  };

  const handleDrillComplete = () => {
    setDrillCompleted(true);
    setPhase("quiz");
  };

  const handleSelect = (i: number) => {
    if (lockedPreview || revealed) return;
    setSelected(i);
    setRevealed(true);
    if (current && i === current.correct_index) {
      setCorrectCount((c) => c + 1);
    }
  };

  const persistLevelResult = async (finalPct: number, didPass: boolean) => {
    if (lockedPreview || !userId || !chapter) return;
    await (supabase as any).from("nl_training_chapter_level_progress").upsert(
      {
        user_id: userId,
        track_id: trackId,
        module_id: moduleId,
        chapter_id: chapter.id,
        quiz_level: currentLevel,
        status: didPass ? "completed" : "in_progress",
        score: finalPct,
        attempts: 1,
        last_attempt_at: new Date().toISOString(),
        completed_at: didPass ? new Date().toISOString() : null,
      },
      { onConflict: "user_id,chapter_id,quiz_level" }
    );

    const nextProgress = [
      ...levelProgress.filter((row) => row.quiz_level !== currentLevel),
      { quiz_level: currentLevel, status: didPass ? "completed" : "in_progress", score: finalPct } as LevelProgressRow,
    ];
    setLevelProgress(nextProgress);

    if (didPass && currentLevel === 3) {
      await supabase.from("nl_training_progress").upsert(
        {
          user_id: userId,
          track_id: trackId,
          module_id: moduleId,
          chapter_id: chapter.id,
          status: "completed",
          score: finalPct,
          attempts: 1,
          last_attempt_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,module_id,chapter_id" } as any
      );
    }
  };

  const persistModuleResult = async (finalPct: number, didPass: boolean) => {
    if (lockedPreview || !userId) return;
    await supabase.from("nl_training_progress").upsert(
      {
        user_id: userId,
        track_id: trackId,
        module_id: moduleId,
        chapter_id: null,
        status: didPass ? "completed" : "in_progress",
        score: finalPct,
        attempts: 1,
        last_attempt_at: new Date().toISOString(),
        completed_at: didPass ? new Date().toISOString() : null,
      },
      { onConflict: "user_id,module_id,chapter_id" } as any
    );

    if (didPass) {
      const { data: thisMod } = await supabase
        .from("nl_training_modules")
        .select("module_number, track_id")
        .eq("id", moduleId)
        .maybeSingle();
      if (thisMod) {
        const { data: nextMod } = await supabase
          .from("nl_training_modules")
          .select("id")
          .eq("track_id", thisMod.track_id)
          .eq("module_number", thisMod.module_number + 1)
          .maybeSingle();
        if (nextMod?.id) {
          await supabase.from("nl_training_modules").update({ is_locked: false }).eq("id", nextMod.id);
        }
      }
    }
  };

  const handleNext = async () => {
    if (lockedPreview) return;
    if (qIdx < totalQ - 1) {
      setQIdx((i) => i + 1);
      setSelected(null);
      setRevealed(false);
      return;
    }

    const finalPct = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
    const didPass = finalPct >= passScore;
    setLastScorePct(finalPct);
    setLastPassed(didPass);
    setPhase("result");
    try {
      if (mode === "chapter") {
        await persistLevelResult(finalPct, didPass);
      } else {
        await persistModuleResult(finalPct, didPass);
      }
    } catch (error) {
      toast({ title: "Progress was not saved", description: "Please try again before leaving this screen.", variant: "destructive" });
    }
  };

  const handleMarkComplete = async () => {
    if (lockedPreview) return;
    setSaving(true);
    try {
      if (mode === "chapter" && chapter && userId) {
        await supabase.from("nl_training_progress").upsert(
          {
            user_id: userId,
            track_id: trackId,
            module_id: moduleId,
            chapter_id: chapter.id,
            status: "completed",
            score: lastScorePct,
            attempts: 1,
            last_attempt_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          },
          { onConflict: "user_id,module_id,chapter_id" } as any
        );
      }
      onCompleted();
      onClose();
    } catch (error) {
      toast({ title: "Could not mark complete", description: "Your chapter progress did not save. Try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const levelBadges = mode === "chapter" && (
    <div className="grid grid-cols-3 gap-2 mb-6">
      {([1, 2, 3] as QuizLevel[]).map((level) => {
        const complete = isLevelComplete(level);
        const unlocked = isLevelUnlocked(level);
        return (
          <button
            key={level}
            type="button"
            disabled={!unlocked || complete}
            onClick={() => unlocked && !complete && resetQuiz(level)}
            className={`rounded-lg border px-3 py-2 text-left transition-colors ${
              complete
                ? "border-[hsl(152,60%,50%)]/40 bg-[hsl(152,60%,50%)]/[0.08]"
                : unlocked
                  ? "border-primary/40 bg-primary/10 hover:bg-primary/15"
                  : "border-border/40 bg-secondary/40 opacity-60"
            }`}
          >
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {complete ? <CheckCircle2 className="h-3 w-3 text-[hsl(152,60%,50%)]" /> : unlocked ? <BookOpen className="h-3 w-3 text-primary" /> : <Lock className="h-3 w-3" />}
              Level {level}
            </div>
            <div className="mt-1 text-xs font-medium text-foreground">{LEVEL_LABELS[level]}</div>
          </button>
        );
      })}
    </div>
  );

  const lockedBanner = lockedPreview && unlockModuleNumber ? (
    <div className="mb-5 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
      Complete Module {unlockModuleNumber} to unlock quizzes and progress tracking for this module
    </div>
  ) : null;

  const lockedQuizState = (
    <div className="mt-8 sm:mt-10 rounded-xl border border-primary/25 bg-primary/10 p-5 text-center">
      <Lock className="mx-auto mb-3 h-8 w-8 text-primary" />
      <h2 className="text-lg font-semibold text-foreground">Quiz Locked</h2>
      <p className="mt-2 text-sm font-medium text-primary">Complete the previous module to unlock this quiz.</p>
    </div>
  );

  const quizButton = (
    <Button
      onClick={() => lockedPreview && requiresDrill && !drillCompleted ? setPhase("drill") : resetQuiz(currentLevel)}
      disabled={(lockedPreview && !requiresDrill) || currentLevelQuestions.length === 0}
      className="gap-2"
    >
      {lockedPreview && requiresDrill && !drillCompleted ? "Preview Script Drill" : requiresDrill && !drillCompleted ? "Start Script Drill" : `Take Level ${currentLevel} Quiz`}
      <CheckCircle2 className="h-4 w-4" />
    </Button>
  );

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto overflow-x-hidden">
      <div className="w-full max-w-4xl mx-auto px-3 pb-10 pt-5 sm:px-4 sm:pb-14 sm:pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 sm:mb-6">
          <Button variant="ghost" size="sm" onClick={onClose} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to module
          </Button>
          <Badge variant="secondary" className="font-medium">
            {mode === "chapter" ? `Chapter ${chapter?.chapter_number}` : "Module Test"}
          </Badge>
        </div>

        {loading ? (
          <div className="card-widget text-center py-16 text-muted-foreground text-sm">Loading…</div>
        ) : phase === "reading" && chapter ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="w-full">
            {lockedBanner}
            <div className="mb-5 rounded-2xl border border-border/40 bg-card/60 p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-4 w-4 text-primary" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Reading</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-3 leading-tight">{chapter.chapter_title}</h1>
              {levelBadges}
              <Progress value={(completedLevels / 3) * 100} className="h-1.5" />
            </div>
            <TrainingContentRenderer content={chapter.content || ""} />
            {flashcards.length > 0 && <ObjectionFlashcards cards={flashcards} />}
            {showPracticeVault && <PracticeRecordingVault chapterId={chapter.id} lockedPreview={lockedPreview} />}
            {lockedPreview ? lockedQuizState : <div className="mt-8 sm:mt-10 flex justify-stretch sm:justify-end">{quizButton}</div>}
          </motion.div>
        ) : phase === "drill" && chapter && requiresDrill ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="card-widget w-full p-4 sm:p-8">
            <ScriptDrillExercise
              lines={drillLines}
              trackId={trackId}
              moduleId={moduleId}
              chapterId={chapter.id}
              onComplete={handleDrillComplete}
              lockedPreview={lockedPreview}
            />
          </motion.div>
        ) : lockedPreview && phase === "quiz" ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="card-widget w-full p-4 sm:p-8">
            {lockedQuizState}
            <div className="mt-5 flex justify-center"><Button variant="outline" onClick={onClose}>Back to module</Button></div>
          </motion.div>
        ) : phase === "quiz" && current ? (
          <motion.div key={`${current.id}-${currentLevel}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="card-widget w-full p-4 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {mode === "chapter" ? `Level ${currentLevel} · ${LEVEL_LABELS[currentLevel]}` : "Module Test"} · Question {qIdx + 1} of {totalQ}
              </span>
              <span className="text-[11px] font-semibold text-foreground">Score: {correctCount} / {totalQ}</span>
            </div>
            <Progress value={((qIdx + (revealed ? 1 : 0)) / totalQ) * 100} className="h-1.5 mb-6" />
            <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-6 leading-snug">{current.question_text}</h2>
            <div className="space-y-3">
              {current.options.map((opt, i) => {
                const isCorrect = i === current.correct_index;
                const isSelected = selected === i;
                let stateClass = "border-border/40 hover:bg-white/[0.03]";
                if (revealed) {
                  if (isCorrect) stateClass = "border-[hsl(152,60%,50%)]/60 bg-[hsl(152,60%,50%)]/[0.08]";
                  else if (isSelected) stateClass = "border-[hsl(0,75%,60%)]/60 bg-[hsl(0,75%,60%)]/[0.08]";
                  else stateClass = "border-border/30 opacity-60";
                }
                return (
                  <button key={i} onClick={() => handleSelect(i)} disabled={revealed} className={`w-full text-left px-4 py-3 rounded-lg border transition-all duration-200 flex items-center gap-3 ${stateClass}`}>
                    <div className="h-6 w-6 rounded-md bg-secondary flex items-center justify-center text-[11px] font-semibold shrink-0">{String.fromCharCode(65 + i)}</div>
                    <span className="text-sm text-foreground/90 flex-1">{opt}</span>
                    {revealed && isCorrect && <CheckCircle2 className="h-4 w-4 text-[hsl(152,60%,50%)] shrink-0" />}
                    {revealed && isSelected && !isCorrect && <XCircle className="h-4 w-4 text-[hsl(0,75%,60%)] shrink-0" />}
                  </button>
                );
              })}
            </div>
            <AnimatePresence>
              {revealed && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`mt-5 rounded-lg border p-4 ${selected === current.correct_index ? "border-[hsl(152,60%,50%)]/40 bg-[hsl(152,60%,50%)]/[0.06]" : "border-[hsl(0,75%,60%)]/40 bg-[hsl(0,75%,60%)]/[0.06]"}`}>
                  <div className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 text-muted-foreground">{selected === current.correct_index ? "Correct" : "Not quite"}</div>
                  <p className="text-sm text-foreground/85 leading-relaxed">{current.explanation}</p>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="mt-6 flex justify-stretch sm:justify-end">
              <Button onClick={handleNext} disabled={!revealed} className="gap-2">{qIdx < totalQ - 1 ? "Next question" : "Finish"}</Button>
            </div>
          </motion.div>
        ) : phase === "result" ? (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }} className="card-widget text-center p-5 sm:p-8">
            <div className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-4 bg-secondary">
              {passed ? <Trophy className="h-8 w-8 text-[hsl(152,60%,50%)]" /> : <Clock className="h-8 w-8 text-[hsl(0,75%,60%)]" />}
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-1.5">
              {mode === "chapter"
                ? passed && currentLevel === 3
                  ? "Chapter Complete"
                  : passed
                    ? `Level ${currentLevel} Complete`
                    : "Retake This Level"
                : passed
                  ? "Module Test Passed"
                  : "Not quite there"}
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              You scored {lastScorePct}% {mode === "module_test" && `· pass mark ${passScore}%`}
            </p>
            {mode === "module_test" && !passed && <p className="text-[13px] text-muted-foreground mb-5">Retake available in 24 hours. Review the chapters and try again.</p>}
            <div className="flex flex-col sm:flex-row justify-center gap-2">
              <Button variant="outline" onClick={onClose}>Close</Button>
              {mode === "chapter" && !passed && <Button onClick={() => resetQuiz(currentLevel)}>Retake Level</Button>}
              {mode === "chapter" && passed && currentLevel < 3 && <Button onClick={() => resetQuiz((currentLevel + 1) as QuizLevel)}>Continue to Level {currentLevel + 1}</Button>}
              {!lockedPreview && mode === "chapter" && passed && currentLevel === 3 && <Button onClick={handleMarkComplete} disabled={saving}>{saving ? "Saving…" : "Mark Complete"}</Button>}
              {!lockedPreview && mode === "module_test" && passed && <Button onClick={handleMarkComplete} disabled={saving}>{saving ? "Saving…" : "Continue"}</Button>}
            </div>
          </motion.div>
        ) : (
          <div className="card-widget text-center py-16 text-muted-foreground text-sm">
            No questions available yet.
            <div className="mt-4"><Button variant="outline" onClick={onClose}>Close</Button></div>
          </div>
        )}
      </div>
    </div>
  );
}
