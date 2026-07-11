/**
 * The pixel-art sensei "GEKIATSU" (design/mockups/home-c.html) and its speech
 * bubble. A hype dojo master who cheers the player on. Expressions switch by
 * mood; lines are picked by the caller (home greeting, clear celebration).
 */
export type SenseiMood = "normal" | "hype" | "stern";

export function SenseiSprite({
  mood = "normal",
  size = 112,
}: {
  mood?: SenseiMood;
  size?: number;
}) {
  // Eyes go wide + mouth opens for hype; brow lowers for stern.
  const mouth =
    mood === "hype" ? (
      <rect x="7" y="10" width="5" height="2" fill="#8a2f1c" />
    ) : mood === "stern" ? (
      <rect x="8" y="11" width="4" height="1" fill="#8a2f1c" />
    ) : (
      <rect x="8" y="10" width="3" height="1" fill="#8a2f1c" />
    );
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      style={{ imageRendering: "pixelated" }}
      aria-hidden="true"
    >
      {/* spiked hair */}
      <rect x="6" y="0" width="1" height="2" fill="#1d1a14" />
      <rect x="9" y="0" width="1" height="3" fill="#1d1a14" />
      <rect x="12" y="0" width="1" height="2" fill="#1d1a14" />
      <rect x="7" y="1" width="1" height="2" fill="#1d1a14" />
      <rect x="11" y="1" width="1" height="2" fill="#1d1a14" />
      <rect x="5" y="2" width="1" height="2" fill="#1d1a14" />
      <rect x="13" y="2" width="1" height="2" fill="#1d1a14" />
      {/* headband */}
      <rect x="5" y="4" width="9" height="2" fill="#ff5a3c" />
      <rect x="14" y="4" width="2" height="1" fill="#ff5a3c" />
      <rect x="15" y="5" width="2" height="1" fill="#ff5a3c" />
      {/* face */}
      <rect x="5" y="6" width="9" height="5" fill="#f0b58a" />
      {/* eyes */}
      <rect x="6" y="7" width="2" height="2" fill="#ffffff" />
      <rect x="11" y="7" width="2" height="2" fill="#ffffff" />
      <rect
        x={mood === "hype" ? 7 : 7}
        y="8"
        width="1"
        height="1"
        fill="#1d1a14"
      />
      <rect x="11" y="8" width="1" height="1" fill="#1d1a14" />
      {mouth}
      {/* body + black tights */}
      <rect x="6" y="11" width="7" height="4" fill="#f0b58a" />
      {/* raised right fist for hype */}
      {mood === "hype" && (
        <>
          <rect x="15" y="4" width="2" height="4" fill="#f0b58a" />
          <rect x="15" y="3" width="2" height="1" fill="#f0b58a" />
        </>
      )}
      <rect x="6" y="15" width="7" height="2" fill="#1d1a14" />
      <rect x="6" y="17" width="2" height="3" fill="#1d1a14" />
      <rect x="11" y="17" width="2" height="3" fill="#1d1a14" />
    </svg>
  );
}

export function SpeechBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mb-4 inline-block bg-paper px-5 py-3 font-black text-paper-ink shadow-[3px_3px_0_rgb(0_0_0/0.6)]">
      <span
        aria-hidden="true"
        className="absolute -left-2.5 top-4 border-6 border-transparent border-r-paper"
      />
      {children}
    </div>
  );
}

/** Sensei guidance panel for generated exercises (daily/drill screens). */
export function SenseiHintPanel({ hint }: { hint?: string | undefined }) {
  return (
    <div className="pixel-panel p-4">
      <div className="mb-2 flex items-center gap-2 font-mono text-xs font-black tracking-[0.2em] text-matcha">
        <SenseiSprite size={28} /> 師範のひとこと
      </div>
      <p className="text-sm text-cream-dim">
        {hint ??
          "バッファを TARGET と同じ形にすれば一本だ。迷ったら移動して x から始めろ。"}
      </p>
    </div>
  );
}
