/**
 * Achievement unlock toast: pops in the corner whenever setProfile unlocked
 * something (R18), then auto-dismisses. Motion spring keeps it snappy —
 * effects never block input (docs/project-overview.md UI/UX).
 */
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { playUnlock } from "./sound";
import { useAppStore } from "./storeContext";

export function AchievementToast() {
  const unlocked = useAppStore((s) => s.unlockedToast);
  const dismiss = useAppStore((s) => s.dismissToast);

  useEffect(() => {
    if (unlocked.length === 0) return;
    playUnlock();
    const timer = setTimeout(dismiss, 4500);
    return () => clearTimeout(timer);
  }, [unlocked, dismiss]);

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-20 flex flex-col gap-3">
      <AnimatePresence>
        {unlocked.map((def) => (
          <motion.div
            key={def.id}
            initial={{ x: 80, opacity: 0, rotate: 3 }}
            animate={{ x: 0, opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="pixel-panel flex items-center gap-3 px-5 py-3"
          >
            <span className="text-3xl">{def.icon}</span>
            <div>
              <div className="font-mono text-[10px] font-black tracking-[0.2em] text-gold">
                実績解除!!
              </div>
              <div className="font-black">{def.name}</div>
              <div className="text-xs text-cream-faint">{def.description}</div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
