/**
 * Hand-made drill content for the first playable build (PLAN M5).
 * Stage-1/2 commands only. Pars are the author's best solutions — verify by
 * playing before changing (docs/domain.md P4). Replaced by real curriculum
 * content in M6 and generated drills in M7.
 */
import { commandId, exerciseId } from "../ids";
import type { Exercise } from "../practice/exercise";

export const sampleDrillExercises: Exercise[] = [
  {
    id: exerciseId("drill-sample-1"),
    title: "余計な単語を消せ",
    initialBuffer: "hello dirty world",
    targetBuffer: "hello world",
    // w → dw
    par: 3,
    practicedCommands: [commandId("w"), commandId("dw")],
  },
  {
    id: exerciseId("drill-sample-2"),
    title: "タイポを直せ: wrold → world",
    initialBuffer: 'console.log("hello wrold");',
    targetBuffer: 'console.log("hello world");',
    // fr → x → p (transpose)。ci" で書き直すと銅になる寸法
    par: 4,
    practicedCommands: [commandId("f"), commandId("x"), commandId("p")],
  },
  {
    id: exerciseId("drill-sample-3"),
    title: "重複した行を消せ",
    initialBuffer: "const a = 1;\nconst a = 1;\nconst b = 2;",
    targetBuffer: "const a = 1;\nconst b = 2;",
    // dd
    par: 2,
    practicedCommands: [commandId("dd")],
  },
];
