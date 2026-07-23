import { describe, expect, it } from "vitest";
import { stages } from "./curriculum/stages";
import { seededRandom } from "./generation/rng";
import { lessonId } from "./ids";
import { initialProfile, type Profile } from "./profile";
import { BANK, commandLabel, generateQuiz } from "./quiz";

const cleared = (...ids: string[]): Profile => ({
  ...initialProfile,
  lessonClears: Object.fromEntries(
    ids.map((id) => [lessonId(id), { clearedAt: new Date() }]),
  ),
});

describe("generateQuiz", () => {
  it("returns the requested number of questions with 4 unique choices", () => {
    const quiz = generateQuiz(initialProfile, stages, seededRandom("a"), 3);
    expect(quiz).toHaveLength(3);
    for (const q of quiz) {
      expect(q.choices).toHaveLength(4);
      const labels = q.choices.map((c) => c.label);
      expect(new Set(labels).size).toBe(4); // no duplicate choices
      expect(q.choices.filter((c) => c.correct)).toHaveLength(1);
      expect(q.before).not.toBe(q.after);
      expect(q.explanation.length).toBeGreaterThan(0);
    }
  });

  it("is deterministic for a given seed", () => {
    const a = generateQuiz(initialProfile, stages, seededRandom("same"), 3);
    const b = generateQuiz(initialProfile, stages, seededRandom("same"), 3);
    expect(a).toEqual(b);
  });

  it("prefers cleared lessons' commands as the correct answer", () => {
    const profile = cleared("s1-l1-x"); // only x cleared
    // With one cleared lesson, the first question's answer should be that
    // lesson's command; run several seeds to confirm cleared-first ordering.
    const answers = ["a", "b", "c", "d"].map((s) => {
      const q = generateQuiz(profile, stages, seededRandom(s), 1)[0]!;
      return q.choices.find((c) => c.correct)!.label;
    });
    expect(answers.every((a) => a === "x")).toBe(true);
  });
});

// The bank's declared invariant: every answer command IS a lesson label.
// A renamed lesson must fail here, not silently break cleared-lesson gating.
it("every bank command matches a lesson label in stages", () => {
  const lessonLabels = new Set(
    stages.flatMap((s) => s.lessons.map((l) => commandLabel(l.title))),
  );
  for (const item of BANK) {
    expect(lessonLabels, `bank command "${item.command}"`).toContain(
      item.command,
    );
  }
});
