/**
 * Achievements (R18): unlocked the moment their condition holds, never
 * revoked. Conditions read only the Profile, so evaluation is a pure fold
 * that runs after every profile change (ui/store.ts centralizes the call).
 */
import { achievementId, type AchievementId } from "../ids";
import type { Profile } from "../profile";
import { stages } from "../curriculum/stages";
import { isLessonCleared } from "../curriculum/curriculum";
import { levelFromXp } from "./xp";

export interface AchievementDef {
  id: AchievementId;
  icon: string;
  name: string;
  description: string;
  isSatisfied(profile: Profile): boolean;
}

const goldCount = (profile: Profile) =>
  Object.values(profile.exerciseBests).filter((b) => b.medal === "gold").length;

export const achievementDefs: AchievementDef[] = [
  {
    id: achievementId("first-lesson"),
    icon: "⛩️",
    name: "入門",
    description: "最初のレッスンをクリアする",
    isSatisfied: (p) => Object.keys(p.lessonClears).length >= 1,
  },
  {
    id: achievementId("first-gold"),
    icon: "🥇",
    name: "初めての一本",
    description: "初めて金メダルを取る",
    isSatisfied: (p) => goldCount(p) >= 1,
  },
  {
    id: achievementId("golds-10"),
    icon: "💎",
    name: "パー超え十番",
    description: "金メダルを10個集める",
    isSatisfied: (p) => goldCount(p) >= 10,
  },
  {
    id: achievementId("streak-7"),
    icon: "🔥",
    name: "七日の修行",
    description: "7日連続で修行する",
    isSatisfied: (p) => p.streak.longest >= 7,
  },
  {
    id: achievementId("streak-30"),
    icon: "🌊",
    name: "三十日の道",
    description: "30日連続で修行する(成功条件のひとつ)",
    isSatisfied: (p) => p.streak.longest >= 30,
  },
  {
    id: achievementId("stage1-master"),
    icon: "📜",
    name: "基本移動 皆伝",
    description: "STAGE 1 の全レッスンをクリアする",
    isSatisfied: (p) => {
      const stage1 = stages[0];
      return (
        !!stage1 &&
        stage1.lessons.length > 0 &&
        stage1.lessons.every((l) => isLessonCleared(p, l.id))
      );
    },
  },
  {
    id: achievementId("daily-debut"),
    icon: "🏮",
    name: "日課はじめ",
    description: "デイリーチャレンジを初めてクリアする",
    isSatisfied: (p) =>
      Object.keys(p.exerciseBests).some((id) => id.startsWith("daily-")),
  },
  {
    id: achievementId("level-5"),
    icon: "🥋",
    name: "五段の構え",
    description: "レベル5に到達する",
    isSatisfied: (p) => levelFromXp(p.xp) >= 5,
  },
];

export interface AchievementOutcome {
  profile: Profile;
  newlyUnlocked: AchievementDef[];
}

/** Unlock every satisfied-but-not-yet-recorded achievement (R18). */
export function evaluateAchievements(
  profile: Profile,
  now: Date,
): AchievementOutcome {
  const newlyUnlocked = achievementDefs.filter(
    (def) =>
      profile.achievements[def.id] === undefined && def.isSatisfied(profile),
  );
  if (newlyUnlocked.length === 0) return { profile, newlyUnlocked };
  return {
    profile: {
      ...profile,
      achievements: {
        ...profile.achievements,
        ...Object.fromEntries(
          newlyUnlocked.map((def) => [def.id, { unlockedAt: now }]),
        ),
      },
    },
    newlyUnlocked,
  };
}
