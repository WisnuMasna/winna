import type { InjuryLog, SessionType } from '../models/types';

// Mobility is *suggested, never mandatory* (spec). These blocks surface as optional cards;
// session completion is never gated on them. Prehab is injury-aware: while an injury is
// active, targeted prehab for that area is suggested on strength and rest days.

export interface MobilityBlock {
  id: string;
  title: string;
  durationMin: number;
  items: string[];
  reason?: string; // shown when injury-driven
}

const PRE_RUN: MobilityBlock = {
  id: 'pre-run',
  title: 'Pre-run warm-up',
  durationMin: 5,
  items: ['Leg swings x10/side', 'Ankle circles x10/side', 'Walking lunges x10', 'Hip openers x8/side'],
};

const POST_LOWER: MobilityBlock = {
  id: 'post-lower',
  title: 'Post-lift stretch',
  durationMin: 5,
  items: ['Couch stretch 60s/side', 'Hip flexor stretch 45s/side', 'Calf stretch 45s/side'],
};

const POST_UPPER: MobilityBlock = {
  id: 'post-upper',
  title: 'Post-lift stretch',
  durationMin: 5,
  items: ['Doorway chest stretch 45s/side', 'Thoracic extensions x10', 'Cross-body shoulder 30s/side'],
};

const REST_FLOW: MobilityBlock = {
  id: 'rest-flow',
  title: 'Optional mobility flow',
  durationMin: 5,
  items: ['Cat–cow x10', "World's greatest stretch x5/side", '90/90 hip switches x10', 'Deep squat hold 60s'],
};

function prehabFor(injury: InjuryLog): MobilityBlock | null {
  const loc = injury.location.toLowerCase();
  if (loc.includes('ankle') || loc.includes('calf') || loc.includes('achilles')) {
    return {
      id: `prehab-ankle-${injury.id}`,
      title: 'Ankle / calf prehab',
      durationMin: 5,
      items: ['Ankle alphabet x1/side', 'Single-leg balance 30s/side', 'Calf raises 3x15', 'Eccentric heel drops 3x10'],
      reason: `Active issue: ${injury.location}`,
    };
  }
  if (loc.includes('knee')) {
    return {
      id: `prehab-knee-${injury.id}`,
      title: 'Knee prehab',
      durationMin: 5,
      items: ['Terminal knee extensions 3x15', 'Step-downs 3x10/side', 'Wall sit 2x30s'],
      reason: `Active issue: ${injury.location}`,
    };
  }
  if (loc.includes('hip') || loc.includes('glute') || loc.includes('it band') || loc.includes('itb')) {
    return {
      id: `prehab-hip-${injury.id}`,
      title: 'Hip / glute prehab',
      durationMin: 5,
      items: ['Clamshells 3x15/side', 'Monster walks 3x10 steps', 'Glute bridges 3x15'],
      reason: `Active issue: ${injury.location}`,
    };
  }
  return null;
}

/** Optional mobility suggestions for a session type, aware of active injuries. */
export function mobilitySuggestions(
  sessionType: SessionType,
  activeInjuries: InjuryLog[],
  split?: 'lower' | 'upper',
): MobilityBlock[] {
  const blocks: MobilityBlock[] = [];

  if (sessionType === 'run') blocks.push(PRE_RUN);
  if (sessionType === 'strength') blocks.push(split === 'upper' ? POST_UPPER : POST_LOWER);
  if (sessionType === 'rest' || sessionType === 'mobility') blocks.push(REST_FLOW);

  // Prehab on strength & rest days while injuries are active.
  if (sessionType === 'strength' || sessionType === 'rest' || sessionType === 'mobility') {
    for (const injury of activeInjuries) {
      const block = prehabFor(injury);
      if (block) blocks.push(block);
    }
  }

  return blocks;
}
