import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * SmartBudget logo mark: a wallet holding a pie chart.
 * Drawn in `currentColor`, so set the colour with a text-* class
 * (e.g. `text-primary`, or `text-white` on a gradient).
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  // Mask/clip ids must be unique per instance and valid inside url(#…).
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const mask = `sb-logo-gaps-${uid}`;
  const clip = `sb-logo-pie-${uid}`;

  return (
    <svg
      viewBox="230 200 840 850"
      fill="currentColor"
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <clipPath id={clip}>
          <rect x="0" y="0" width="1300" height="596" />
        </clipPath>
        <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width="1300" height="1300">
          <rect width="1300" height="1300" fill="#fff" />
          <g stroke="#000" strokeWidth="20" strokeLinecap="round" fill="none">
            <line x1="637" y1="190" x2="637" y2="600" />
            <line x1="645" y1="478" x2="900" y2="295" />
            <path d="M940,520 L940,560 C935,590 925,606 900,606 L360,606 C320,606 285,590 272,560 C262,535 285,512 318,512" />
          </g>
          <polygon points="637,488 845,602 637,602" fill="#000" />
          <rect x="780" y="703" width="320" height="202" rx="101" fill="#000" />
        </mask>
      </defs>
      <g mask={`url(#${mask})`}>
        <circle cx="637" cy="505" r="287" clipPath={`url(#${clip})`} />
        <path d="M318,498 C275,498 245,528 245,565 L245,945 C245,995 290,1035 345,1035 L885,1035 C940,1035 980,995 980,945 L980,706 L1010,706 L1010,580 C1010,545 985,518 950,518 L940,518 L940,560 C935,590 925,606 900,606 L360,606 C320,606 285,590 272,560 C262,535 285,512 318,512 Z" />
      </g>
      <path
        fillRule="evenodd"
        d="M880,725 L1030,725 Q1050,725 1050,745 L1050,863 Q1050,883 1030,883 L880,883 A79,79 0 0 1 880,725 Z M892,765 A43,43 0 1 0 892.01,765 Z"
      />
    </svg>
  );
}

export const TAGLINE = "Give every penny a purpose";

/** Mark + wordmark, optionally with the tagline underneath. */
export function Logo({
  className,
  markClassName = "h-9 w-9 text-logo",
  showTagline = false,
  taglineClassName = "text-primary",
}: {
  className?: string;
  markClassName?: string;
  showTagline?: boolean;
  taglineClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className={markClassName} />
      <span className="leading-tight">
        <span className="block font-display text-[17px] font-bold tracking-tight">SmartBudget</span>
        {showTagline && (
          <span className={cn("block text-[11px] font-medium", taglineClassName)}>{TAGLINE}</span>
        )}
      </span>
    </span>
  );
}
