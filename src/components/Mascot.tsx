import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Penny, the guide: a soft green orb with cream eyes. She bobs, blinks, looks
 * around, and her mouth moves while she talks.
 */
export function Mascot({
  size = 64,
  talking = false,
  happy = false,
  className,
}: {
  size?: number;
  talking?: boolean;
  /** squinty smiling eyes, for "well done" moments */
  happy?: boolean;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <span
      className={cn("sb-penny relative inline-block shrink-0", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 100 100" width={size} height={size} className="overflow-visible">
        <defs>
          <radialGradient id={`${id}-body`} cx="36%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#8ef0c4" />
            <stop offset="45%" stopColor="#22b98a" />
            <stop offset="100%" stopColor="#046b55" />
          </radialGradient>
          <radialGradient id={`${id}-shine`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* soft shadow */}
        <ellipse
          cx="50"
          cy="96"
          rx="26"
          ry="4"
          className="sb-penny-shadow"
          fill="black"
          opacity="0.18"
        />
        <g className="sb-penny-body">
          <circle cx="50" cy="50" r="44" fill={`url(#${id}-body)`} />
          <ellipse
            cx="34"
            cy="28"
            rx="14"
            ry="9"
            fill={`url(#${id}-shine)`}
            transform="rotate(-25 34 28)"
          />
          {/* cheeks */}
          <ellipse cx="27" cy="62" rx="6" ry="3.5" fill="#ff9c8a" opacity="0.45" />
          <ellipse cx="73" cy="62" rx="6" ry="3.5" fill="#ff9c8a" opacity="0.45" />
          {/* eyes */}
          {happy ? (
            <g stroke="#fbf3dc" strokeWidth="4.5" strokeLinecap="round" fill="none">
              <path d="M30 50 Q37 42 44 50" />
              <path d="M56 50 Q63 42 70 50" />
            </g>
          ) : (
            <g className="sb-penny-eyes">
              <ellipse cx="37" cy="48" rx="8.5" ry="10.5" fill="#fbf3dc" />
              <ellipse cx="63" cy="48" rx="8.5" ry="10.5" fill="#fbf3dc" />
              <g className="sb-penny-look">
                <circle cx="38.5" cy="50" r="4.2" fill="#123b30" />
                <circle cx="64.5" cy="50" r="4.2" fill="#123b30" />
                <circle cx="40" cy="48.2" r="1.4" fill="#fff" />
                <circle cx="66" cy="48.2" r="1.4" fill="#fff" />
              </g>
            </g>
          )}
          {/* mouth */}
          {talking ? (
            <ellipse cx="50" cy="69" rx="6" ry="4" fill="#0b3b2e" className="sb-penny-talk" />
          ) : (
            <path
              d="M42 67 Q50 74 58 67"
              stroke="#0b3b2e"
              strokeWidth="3.2"
              strokeLinecap="round"
              fill="none"
            />
          )}
        </g>
      </svg>
    </span>
  );
}
