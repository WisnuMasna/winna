import type {
  DailyMetrics,
  ReadinessComponent,
  ReadinessLevel,
  SessionType,
  TrainingReadiness,
  WorkoutKind,
} from '../models/types';

// Training Readiness — a Garmin-style composite (0–100) telling you how ready you are to
// train hard today. Garmin blends sleep, recovery time, HRV status, acute load, sleep history
// and stress history. We mirror those inputs: device metrics (sleep/HRV/stress) when a watch
// is synced, plus training load and recovery computed locally so it works without a device.
// Reference: garmin.com/.../physiological-measurements/training-readiness/

interface ReadinessInput {
  acwr: number | null; // acute:chronic workload ratio
  hoursSinceLastSession: number | null;
  metrics: DailyMetrics | null; // device metrics for today, if synced
  todayType?: SessionType | null;
  todayKind?: WorkoutKind | null;
  todayLabel?: string | null;
}

// Weights across the components; only available ones are counted (weights renormalized).
const WEIGHTS: Record<ReadinessComponent['key'], number> = {
  load: 0.3,
  recovery: 0.25,
  sleep: 0.25,
  hrv: 0.2,
  stress: 0.0, // folded into an adjustment rather than weighted directly
};

const HARD_KINDS: WorkoutKind[] = ['tempo', 'threshold', 'vo2max', 'race_pace', 'progression', 'long'];

function loadSub(acwr: number | null): number | null {
  if (acwr == null) return null;
  if (acwr > 1.5) return 30; // spike — elevated injury risk
  if (acwr > 1.3) return 60;
  if (acwr >= 0.8) return 92; // the "sweet spot"
  if (acwr >= 0.5) return 75; // fresh, slightly detrained
  return 65;
}

function recoverySub(hours: number | null): number | null {
  if (hours == null) return null;
  if (hours < 12) return 30;
  if (hours < 24) return 52;
  if (hours < 48) return 78;
  return 92;
}

function sleepSub(metrics: DailyMetrics | null): number | null {
  if (metrics?.sleep_score != null) return metrics.sleep_score;
  return null;
}

function hrvSub(metrics: DailyMetrics | null): number | null {
  switch (metrics?.hrv_status) {
    case 'balanced':
      return 90;
    case 'unbalanced':
      return 55;
    case 'low':
      return 35;
    case 'poor':
      return 25;
    default:
      return null;
  }
}

function levelFor(score: number): ReadinessLevel {
  if (score >= 85) return 'prime';
  if (score >= 70) return 'high';
  if (score >= 50) return 'moderate';
  if (score >= 25) return 'low';
  return 'poor';
}

const HEADLINE: Record<ReadinessLevel, string> = {
  prime: 'Primed',
  high: 'Ready to train',
  moderate: 'Train with awareness',
  low: 'Take it easy',
  poor: 'Prioritize recovery',
};

export const READINESS_LEVEL_LABEL: Record<ReadinessLevel, string> = {
  prime: 'Prime',
  high: 'High',
  moderate: 'Moderate',
  low: 'Low',
  poor: 'Poor',
};

function recommendationFor(
  level: ReadinessLevel,
  input: ReadinessInput,
): string {
  const label = input.todayLabel || 'session';
  const isHard = input.todayKind ? HARD_KINDS.includes(input.todayKind) : false;
  const isEasyDay = input.todayType === 'rest' || input.todayKind === 'easy' || input.todayKind === 'recovery';

  if (level === 'poor') return `Rest or very easy movement only — skip or swap today's ${label}.`;
  if (level === 'low') {
    return isHard
      ? `Readiness is low. Swap today's ${label} for an easy run or rest.`
      : `Readiness is low. Keep today easy and skip any extras.`;
  }
  if (level === 'moderate') return `Good to train as planned. Hold back on adding extra intensity.`;
  if (level === 'high') return `Green light — train as planned, quality sessions welcome.`;
  // prime
  return isEasyDay
    ? `You're primed — a great day to bring a quality session forward if you feel like it.`
    : `You're primed — go get today's ${label}.`;
}

export function computeTrainingReadiness(input: ReadinessInput): TrainingReadiness {
  const subs: Record<ReadinessComponent['key'], number | null> = {
    load: loadSub(input.acwr),
    recovery: recoverySub(input.hoursSinceLastSession),
    sleep: sleepSub(input.metrics),
    hrv: hrvSub(input.metrics),
    stress: null,
  };

  // Weighted average over available components.
  let weighted = 0;
  let weightSum = 0;
  (Object.keys(WEIGHTS) as ReadinessComponent['key'][]).forEach((k) => {
    const sub = subs[k];
    const w = WEIGHTS[k];
    if (sub != null && w > 0) {
      weighted += sub * w;
      weightSum += w;
    }
  });

  const hasDeviceData = input.metrics != null && (subs.sleep != null || subs.hrv != null);

  // Need at least the local signals (load or recovery) to say anything meaningful.
  const enough = subs.load != null || subs.recovery != null;
  let score: number | null = enough && weightSum > 0 ? Math.round(weighted / weightSum) : null;

  // High stress nudges the score down a touch when a device reports it.
  if (score != null && input.metrics?.stress != null && input.metrics.stress > 60) {
    score = Math.max(0, score - Math.round((input.metrics.stress - 60) / 5));
  }

  const level = score != null ? levelFor(score) : null;

  const components: ReadinessComponent[] = [
    {
      key: 'sleep',
      label: 'Sleep',
      status: input.metrics?.sleep_score != null ? `${input.metrics.sleep_score}/100` : 'No device data',
      sub: subs.sleep,
    },
    {
      key: 'hrv',
      label: 'HRV status',
      status: input.metrics?.hrv_status ? capitalize(input.metrics.hrv_status) : 'No device data',
      sub: subs.hrv,
    },
    {
      key: 'recovery',
      label: 'Recovery',
      status:
        input.hoursSinceLastSession == null
          ? 'Unknown'
          : `${Math.round(input.hoursSinceLastSession)}h since last session`,
      sub: subs.recovery,
    },
    {
      key: 'load',
      label: 'Training load',
      status: input.acwr == null ? 'Not enough history' : `ACWR ${input.acwr.toFixed(2)}`,
      sub: subs.load,
    },
  ];

  return {
    score,
    level,
    headline: level ? HEADLINE[level] : 'Not enough data yet',
    recommendation: level
      ? recommendationFor(level, input)
      : 'Log or sync a few sessions — or connect Garmin — to see your training readiness.',
    components,
    hasDeviceData,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
