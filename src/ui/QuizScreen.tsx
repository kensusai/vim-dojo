/**
 * Command quiz screen — the phone-friendly, tap-only mode reached from the
 * daily reminder (route "quiz"; deep link ?mode=quiz). Mobile-first layout
 * (no 1440 desktop frame): full width, big tap targets. Finishing counts as
 * the day's learning activity so the streak can be kept from a phone.
 */
import { useRef, useState } from "react";
import { recordLearningActivity } from "../core/applyProgress";
import { CURSOR, generateQuiz } from "../core/quiz";
import { seededRandom } from "../core/generation/rng";
import { stages } from "../core/curriculum/stages";
import { playClear, playLessonComplete } from "./sound";
import { useAppStore } from "./storeContext";

export function QuizScreen() {
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const clock = useAppStore((s) => s.clock);
  const navigate = useAppStore((s) => s.navigate);

  // One quiz per screen mount; seed by the mount instant for variety. Refs
  // read the latest profile/clock without making the quiz regenerate.
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const clockRef = useRef(clock);
  clockRef.current = clock;
  const [questions] = useState(() =>
    generateQuiz(
      profileRef.current,
      stages,
      seededRandom(`quiz-${clockRef.current.now().getTime()}`),
      3,
    ),
  );

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);

  const question = questions[index];

  const pick = (choiceIndex: number) => {
    if (picked !== null || !question) return;
    setPicked(choiceIndex);
    const right = question.choices[choiceIndex]?.correct ?? false;
    if (right) {
      setCorrectCount((n) => n + 1);
      playClear("gold");
    }
  };

  const next = () => {
    if (index < questions.length - 1) {
      setIndex((i) => i + 1);
      setPicked(null);
    } else {
      // Completing the quiz is the day's learning activity (R8) — keeps the
      // streak alive from a phone. No XP/medals: recognition, not execution.
      const { profile: updated } = recordLearningActivity(profile, clock.now());
      setProfile(updated);
      playLessonComplete();
      setDone(true);
    }
  };

  if (questions.length === 0) {
    return (
      <Shell>
        <p className="text-center text-cream-dim">
          まずレッスンを1つクリアすると、クイズが出せるようになる。
        </p>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell>
        <div className="text-center">
          <div className="ippon-pop text-5xl font-black text-gold [text-shadow:4px_4px_0_var(--color-shu-dark)]">
            今日の一本!!
          </div>
          <p className="mt-4 font-mono text-lg">
            {correctCount} / {questions.length} 正解
          </p>
          <p className="mt-2 text-sm text-matcha">
            🔥 {profile.streak.current}日 — 今日のストリーク、キープ!
          </p>
          <p className="mt-6 text-xs text-cream-faint">
            じっくり鍛えるなら、PC でフル演習をどうぞ。
          </p>
          <button
            type="button"
            onClick={() => navigate({ screen: "home" })}
            className="btn-chunky mt-6 w-full border-b-[6px] border-shu-dark bg-shu py-4 text-lg font-black text-[#fff6ec]"
          >
            ホームへ
          </button>
        </div>
      </Shell>
    );
  }

  if (!question) return null;
  const answered = picked !== null;

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between font-mono text-xs text-cream-faint">
        <span>コマンドクイズ</span>
        <span>
          {index + 1} / {questions.length}
        </span>
      </div>

      <p className="mb-1 text-sm text-cream-dim">{question.prompt}</p>
      <p className="mb-3 flex items-center gap-1 font-mono text-[0.625rem] text-cream-faint">
        <span className="bg-gold px-1 text-ink">■</span> = カーソル位置
      </p>
      <div className="mb-2 rounded border-2 border-ink bg-editor p-3 font-mono text-sm">
        <div className="mb-1 text-[0.625rem] tracking-widest text-cream-faint">
          BEFORE
        </div>
        <CursorText text={question.before} className="text-cream-dim" />
        <div className="mb-1 mt-2 text-[0.625rem] tracking-widest text-cream-faint">
          AFTER
        </div>
        <CursorText text={question.after} className="text-matcha" />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {question.choices.map((choice, i) => {
          const state = !answered
            ? "idle"
            : choice.correct
              ? "right"
              : i === picked
                ? "wrong"
                : "dim";
          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => pick(i)}
              className={`btn-chunky border-3 py-4 text-center font-mono text-lg font-black ${
                state === "idle"
                  ? "border-ink-bold bg-raised text-cream active:bg-ink"
                  : state === "right"
                    ? "border-matcha bg-matcha-dim text-matcha"
                    : state === "wrong"
                      ? "border-shu bg-[#241512] text-shu"
                      : "border-ink bg-raised text-cream-faint opacity-50"
              }`}
            >
              {choice.label}
              {state === "right" && " ✓"}
              {state === "wrong" && " ✗"}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="mt-4">
          <p className="mb-3 border-l-2 border-matcha-dim pl-2 text-sm text-cream-dim">
            💡 {question.explanation}
          </p>
          <button
            type="button"
            autoFocus
            onClick={next}
            className="btn-chunky w-full border-b-[6px] border-shu-dark bg-shu py-4 text-lg font-black text-[#fff6ec]"
          >
            {index < questions.length - 1 ? "次の問題 ▶" : "結果を見る ▶"}
          </button>
        </div>
      )}
    </Shell>
  );
}

/**
 * Render buffer text, drawing the {@link CURSOR} marker as a highlighted cell
 * so a motion question (only the cursor moves) reads at a glance instead of
 * hiding behind a stray glyph. Text with no marker renders plainly.
 */
function CursorText({ text, className }: { text: string; className: string }) {
  const idx = text.indexOf(CURSOR);
  const base = `overflow-x-auto whitespace-pre-wrap break-all ${className}`;
  if (idx === -1) {
    return <pre className={base}>{text}</pre>;
  }
  const before = text.slice(0, idx);
  const rest = text.slice(idx + CURSOR.length);
  // The cursor sits ON the next character; at end-of-line show a blank cell.
  const onEol = rest.length === 0 || rest[0] === "\n";
  const onChar = onEol ? " " : rest[0]!;
  const after = onEol ? rest : rest.slice(1);
  return (
    <pre className={base}>
      {before}
      <span className="bg-gold text-ink">{onChar}</span>
      {after}
    </pre>
  );
}

/** Mobile-first shell — deliberately NOT the desktop 1440 frame. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-md px-4 py-6">
      <div className="mb-6 flex items-center gap-2 font-mono text-lg font-black tracking-widest">
        <span className="flex h-8 w-8 items-center justify-center bg-shu text-paper">
          道
        </span>
        vim-dojo
      </div>
      {children}
    </div>
  );
}
