"use client";

import type { CompanionState } from "@/domains/planning/day-view";

const FACES: Record<
  CompanionState,
  { leftY: number; rightY: number; mouth: string; tilt: number; closed: boolean }
> = {
  idle: { leftY: 28, rightY: 28, mouth: "M26 36 Q32 42 38 36", tilt: 0, closed: false },
  curious: { leftY: 26, rightY: 30, mouth: "M26 37 Q32 41 38 37", tilt: -8, closed: false },
  thinking: { leftY: 26, rightY: 30, mouth: "M27 36 H37", tilt: -6, closed: false },
  focused: { leftY: 28, rightY: 28, mouth: "M26 36 H38", tilt: 0, closed: false },
  reminding: { leftY: 27, rightY: 27, mouth: "M25 35 Q32 44 39 35", tilt: 4, closed: false },
  warning: { leftY: 26, rightY: 26, mouth: "M26 38 H38", tilt: 0, closed: false },
  celebrating: { leftY: 27, rightY: 27, mouth: "M24 34 Q32 46 40 34", tilt: 0, closed: false },
  resting: { leftY: 28, rightY: 28, mouth: "M27 36 H37", tilt: 3, closed: true },
};

export function Daymark({ state, size = 72 }: { state: CompanionState; size?: number }) {
  const face = FACES[state];
  const clothes = state === "warning" ? "#e06a2c" : state === "resting" ? "#b86a3a" : "#e07a32";
  return (
    <svg
      viewBox="0 0 64 88"
      width={size}
      height={Math.round(size * 1.38)}
      className="shrink-0"
      aria-hidden
      style={{ transform: `rotate(${face.tilt}deg)` }}
    >
      <ellipse cx="32" cy="84" rx="14" ry="3" fill="#2a2622" opacity="0.1" />
      <rect x="18" y="42" width="28" height="28" rx="10" fill={clothes} />
      <circle cx="32" cy="24" r="13" fill="#e8c4a0" />
      <path d="M18 28 C18 8 46 8 46 28 L43 42 C36 36 28 36 21 42 Z" fill="#fff9ed" />
      {face.closed ? (
        <>
          <path d="M24 28 H30" stroke="#2b1c12" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M34 28 H40" stroke="#2b1c12" strokeWidth="1.8" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="27" cy={face.leftY} rx="2" ry="2.4" fill="#2b1c12" />
          <ellipse cx="37" cy={face.rightY} rx="2" ry="2.4" fill="#2b1c12" />
          <circle cx="27.6" cy={face.leftY - 0.6} r="0.55" fill="white" />
          <circle cx="37.6" cy={face.rightY - 0.6} r="0.55" fill="white" />
        </>
      )}
      <path d={face.mouth} fill="none" stroke="#2b1c12" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="10" y="46" width="9" height="16" rx="4.5" fill="#e8c4a0" />
      <rect x="45" y="46" width="9" height="16" rx="4.5" fill="#e8c4a0" />
      <rect x="22" y="68" width="8" height="14" rx="4" fill="#3d4d6a" />
      <rect x="34" y="68" width="8" height="14" rx="4" fill="#3d4d6a" />
    </svg>
  );
}
