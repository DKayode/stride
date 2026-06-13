import type { ReactNode } from 'react';

interface ProgressRingProps {
  /** Completion fraction in 0..1. */
  fraction: number;
  color: string;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}

/** Circular progress indicator with an optional centered label. */
export function ProgressRing({
  fraction,
  color,
  size = 56,
  stroke = 6,
  children,
}: ProgressRingProps) {
  const clamped = Math.min(1, Math.max(0, fraction));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-surface-2"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      {children !== undefined && (
        <div className="absolute inset-0 flex items-center justify-center">{children}</div>
      )}
    </div>
  );
}
