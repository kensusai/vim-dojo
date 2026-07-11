/**
 * Branded ID types (型安全原則: モジュール境界を裸の string で越えない).
 * The runtime representation is a plain string; the brand exists only in the
 * type system so mixing an ExerciseId into a LessonId slot fails to compile.
 * Persisted data gets the same brands re-applied by the storage zod schemas.
 */
declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type ExerciseId = Brand<string, "ExerciseId">;
export type LessonId = Brand<string, "LessonId">;
export type CommandId = Brand<string, "CommandId">;
export type AchievementId = Brand<string, "AchievementId">;

export const exerciseId = (value: string): ExerciseId => value as ExerciseId;
export const lessonId = (value: string): LessonId => value as LessonId;
export const commandId = (value: string): CommandId => value as CommandId;
export const achievementId = (value: string): AchievementId =>
  value as AchievementId;
