import React from 'react';

type Tone = 'sage' | 'dusk' | 'honey' | 'coral' | 'mist';

const TONES: Record<Tone, { core: string; halo: string; ring: string }> = {
  sage: {
    core: 'bg-gradient-to-br from-sage-500 to-sage-700',
    halo: 'bg-sage-500/25',
    ring: 'border-sage-200',
  },
  dusk: {
    core: 'bg-gradient-to-br from-dusk-500 to-dusk-700',
    halo: 'bg-dusk-500/25',
    ring: 'border-dusk-200',
  },
  honey: {
    core: 'bg-gradient-to-br from-honey-500 to-coral-500',
    halo: 'bg-honey-500/25',
    ring: 'border-honey-100',
  },
  coral: {
    core: 'bg-gradient-to-br from-coral-500 to-dusk-500',
    halo: 'bg-coral-500/25',
    ring: 'border-coral-100',
  },
  mist: {
    core: 'bg-gradient-to-br from-sage-200 to-dusk-200',
    halo: 'bg-sage-200/40',
    ring: 'border-line-200',
  },
};

interface BreathingCircleProps {
  size?: number;
  tone?: Tone;
  className?: string;
  /** Adds a thin outer ring that breathes opposite the core */
  withRing?: boolean;
}

/**
 * The signature breathing circle — a slow-pulsing soft orb (4s inhale / 4s exhale).
 * Used as loading state, mood check-in dial, chatbot thinking indicator, and background motif.
 * With prefers-reduced-motion it settles into a still, complete state (handled globally in CSS).
 */
export const BreathingCircle: React.FC<BreathingCircleProps> = ({
  size = 64,
  tone = 'sage',
  className = '',
  withRing = true,
}) => {
  const t = TONES[tone];
  return (
    <span
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {withRing && (
        <span
          className={`absolute inset-0 rounded-full border-2 ${t.ring} animate-breathe`}
          style={{ transform: 'scale(1.18)', animationDirection: 'reverse' }}
        />
      )}
      <span className={`absolute rounded-full blur-xl ${t.halo}`} style={{ inset: size * 0.12 }} />
      <span className={`absolute rounded-full ${t.core} animate-breathe`} style={{ inset: size * 0.16 }} />
    </span>
  );
};

interface WaveDividerProps {
  className?: string;
  flip?: boolean;
}

/** A thin organic wave instead of a hard horizontal rule between sections. */
export const WaveDivider: React.FC<WaveDividerProps> = ({ className = 'text-sage-100', flip = false }) => (
  <svg
    viewBox="0 0 1440 48"
    preserveAspectRatio="none"
    className={`block w-full h-6 sm:h-8 ${flip ? 'rotate-180' : ''} ${className}`}
    aria-hidden="true"
  >
    <path
      fill="currentColor"
      d="M0,32 C180,8 300,48 480,40 C660,32 780,0 960,8 C1140,16 1260,48 1440,32 L1440,48 L0,48 Z"
    />
  </svg>
);

interface SectionHeadingProps {
  title: string;
  sub?: string;
  className?: string;
}

/** Section intros use the warm serif; emphasis comes from whitespace, never centered-bold. */
export const SectionHeading: React.FC<SectionHeadingProps> = ({ title, sub, className = '' }) => (
  <div className={`mb-6 ${className}`}>
    <h2 className="font-display text-2xl sm:text-[1.75rem] font-medium text-ink-900 leading-snug">{title}</h2>
    {sub && <p className="mt-2 text-ink-600 max-w-proseletter">{sub}</p>}
  </div>
);

interface LeafProgressProps {
  value: number; // 0..1
  label: string;
}

/** Progress as a filling organic leaf shape — not a clinical percentage bar. */
export const LeafProgress: React.FC<LeafProgressProps> = ({ value, label }) => {
  const clamped = Math.max(0, Math.min(1, value));
  const h = 64;
  const fillY = h - clamped * h;
  const leafId = React.useId().replace(/:/g, '');
  return (
    <div className="flex items-center gap-3" role="progressbar" aria-valuenow={Math.round(clamped * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <svg width="34" height="64" viewBox="0 0 34 64" aria-hidden="true">
        <defs>
          <clipPath id={`leaf-${leafId}`}>
            <path d="M17 2 C29 14 32 30 17 62 C2 30 5 14 17 2 Z" />
          </clipPath>
        </defs>
        <path d="M17 2 C29 14 32 30 17 62 C2 30 5 14 17 2 Z" fill="#E3EBE4" />
        <g clipPath={`url(#leaf-${leafId})`}>
          <rect x="0" y={fillY} width="34" height={h} fill="#6E8F7C" className="transition-all duration-500 ease-out" />
        </g>
        <path d="M17 2 C29 14 32 30 17 62 C2 30 5 14 17 2 Z" fill="none" stroke="#CBDAD0" strokeWidth="1.5" />
        <path d="M17 8 C17 24 17 40 17 56" stroke="#F6F3EA" strokeWidth="1.2" opacity="0.8" />
      </svg>
      <span className="text-sm text-ink-600">{label}</span>
    </div>
  );
};

interface MoodFaceProps {
  level: number; // 1..5
  size?: number;
  className?: string;
}

const MOOD_COLORS = ['#D98168', '#8C7FA3', '#C4BBD3', '#A3BCAD', '#6E8F7C'];
const MOOD_LABELS = ['Heavy', 'Low', 'Wavering', 'Okay', 'Steady'];
const MOOD_MOUTHS = [
  'M8 15.5 C10 13.5 14 13.5 16 15.5', // heavy — downturned
  'M8 15 C10 14 14 14 16 15', // low — flat-ish
  'M8 14.5 C10 15 14 15 16 14.5', // wavering — gentle wave
  'M8 14 C10 16 14 16 16 14', // okay — slight smile
  'M8 13.5 C10 16.5 14 16.5 16 13.5', // steady — open smile
];

/** Gentle abstract face for the 5-point mood scale — sage→dusk→coral, never red. */
export const MoodFace: React.FC<MoodFaceProps> = ({ level, size = 40, className = '' }) => {
  const idx = Math.max(0, Math.min(4, level - 1));
  const color = MOOD_COLORS[idx];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill={color} opacity="0.16" />
      <circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth="1.6" />
      <circle cx="8.75" cy="9.75" r="1.05" fill={color} />
      <circle cx="15.25" cy="9.75" r="1.05" fill={color} />
      <path d={MOOD_MOUTHS[idx]} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
};

export { MOOD_COLORS, MOOD_LABELS };
