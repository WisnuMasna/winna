import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import {
  Body,
  Button,
  Card,
  Divider,
  Field,
  H2,
  Label,
  Row,
  ScreenScroll,
  SegmentedControl,
} from '../../components/ui';
import { useTheme } from '../../state/ThemeContext';
import { useUnits } from '../../state/SettingsContext';
import { useFeedback } from '../../state/FeedbackContext';
import { useFocusData } from '../../hooks/useFocusData';
import { ExerciseEditor } from '../../components/ExerciseEditor';
import type {
  PlannedDetails,
  ScheduledSession,
  Session,
  SessionType,
  StrengthExercise,
} from '../../models/types';
import {
  deleteScheduled,
  getScheduled,
  insertScheduled,
  parsePlanned,
  setScheduledStatus,
  stringifyPlanned,
  updateScheduled,
} from '../../repositories/plan';
import {
  createSession,
  deleteSession,
  getSession,
  getStrengthForSession,
  setStrengthForSession,
  updateSession,
} from '../../repositories/sessions';
import { listActiveInjuries } from '../../repositories/injuries';
import { listShoes } from '../../repositories/shoes';
import { dropSession, foldSession, pushSession } from '../../services/weekActions';
import { mobilitySuggestions } from '../../domain/mobility';
import { displayToMeters, formatPace, metersToDisplay } from '../../domain/units';
import { normalizeTimeInput, parseGoalTime } from '../../domain/pace';
import type { InjuryLog, Shoe } from '../../models/types';
import type { RootStackScreenProps } from '../../navigation/types';

const TYPES: SessionType[] = ['run', 'strength', 'mobility', 'cross', 'rest'];
const KM_PER_MI = 1.609344;

// Accepts "4:45" or plain digits ("445" → 4:45, "5" → 5:00) → seconds per km.
function parsePaceInput(text: string, unit: 'km' | 'mi'): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  let m: number;
  let s: number;
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':').map((p) => parseInt(p, 10));
    if (parts.length !== 2 || parts.some((p) => isNaN(p))) return null;
    [m, s] = parts;
  } else {
    const d = trimmed.replace(/\D/g, '');
    if (!d) return null;
    if (d.length <= 2) {
      m = parseInt(d, 10);
      s = 0;
    } else {
      m = parseInt(d.slice(0, d.length - 2), 10);
      s = parseInt(d.slice(-2), 10);
    }
  }
  const perDisplay = m * 60 + s;
  return unit === 'mi' ? perDisplay / KM_PER_MI : perDisplay;
}

// Clamp a typed RPE to 1–10 (empty stays empty).
function clampRpe(v: string): string {
  const n = parseInt(v, 10);
  return isNaN(n) ? '' : String(Math.min(10, Math.max(1, n)));
}

interface LoadResult {
  scheduled: ScheduledSession | null;
  session: Session | null;
  strength: StrengthExercise[];
  injuries: InjuryLog[];
  shoes: Shoe[];
}

export function SessionEditScreen({ route, navigation }: RootStackScreenProps<'SessionEdit'>) {
  const t = useTheme();
  const units = useUnits();
  const { scheduledId, sessionId, date } = route.params ?? {};

  const loader = useCallback(async (): Promise<LoadResult> => {
    const scheduled = scheduledId ? await getScheduled(scheduledId) : null;
    const session = sessionId ? await getSession(sessionId) : null;
    const strength = sessionId ? await getStrengthForSession(sessionId) : [];
    const injuries = await listActiveInjuries();
    const shoes = await listShoes();
    return { scheduled, session, strength, injuries, shoes };
  }, [scheduledId, sessionId]);

  const { data, reload } = useFocusData<LoadResult>(loader, {
    scheduled: null,
    session: null,
    strength: [],
    injuries: [],
    shoes: [],
  });

  // ---- Empty-day add mode ----
  if (!scheduledId && !sessionId && date) {
    return <AddForDate date={date} navigation={navigation} />;
  }

  if (data.scheduled) {
    return (
      <ScheduledEditor
        scheduled={data.scheduled}
        injuries={data.injuries}
        onChanged={reload}
        navigation={navigation}
      />
    );
  }

  if (data.session) {
    return (
      <LoggedEditor
        session={data.session}
        strength={data.strength}
        shoes={data.shoes}
        onDeleted={() => navigation.goBack()}
      />
    );
  }

  return (
    <ScreenScroll>
      <Body muted>Loading…</Body>
    </ScreenScroll>
  );
}

// ---------------------------------------------------------------------------
function AddForDate({ date, navigation }: { date: string; navigation: RootStackScreenProps<'SessionEdit'>['navigation'] }) {
  const [type, setType] = useState<SessionType>('run');

  const addPlanned = async () => {
    const planned: PlannedDetails = { label: type === 'run' ? 'Easy run' : type[0].toUpperCase() + type.slice(1) };
    const id = await insertScheduled({
      date,
      type,
      phase: 'base',
      planned_json: stringifyPlanned(planned),
      status: 'planned',
      flag_reason: null,
      template_id: null,
      linked_session_id: null,
    });
    navigation.replace('SessionEdit', { scheduledId: id });
  };

  const logNow = async () => {
    const id = await createSession({
      date,
      type,
      source: 'manual',
      duration_s: null,
      distance_m: null,
      avg_pace_s_per_km: null,
      avg_hr: null,
      rpe: null,
      notes: null,
      shoe_id: null,
    });
    navigation.replace('SessionEdit', { sessionId: id });
  };

  return (
    <ScreenScroll>
      <H2>Add to {date}</H2>
      <Label>Session type</Label>
      <View style={{ marginBottom: 16 }}>
        <SegmentedControl
          options={TYPES.map((x) => ({ label: x[0].toUpperCase() + x.slice(1), value: x }))}
          value={type}
          onChange={setType}
        />
      </View>
      <Button title="Add to plan" onPress={addPlanned} />
      <View style={{ height: 8 }} />
      <Button title="Log a completed session" variant="secondary" onPress={logNow} />
    </ScreenScroll>
  );
}

// ---------------------------------------------------------------------------
function ScheduledEditor({
  scheduled,
  injuries,
  onChanged,
  navigation,
}: {
  scheduled: ScheduledSession;
  injuries: InjuryLog[];
  onChanged: () => void;
  navigation: RootStackScreenProps<'SessionEdit'>['navigation'];
}) {
  const t = useTheme();
  const units = useUnits();
  const { confirm, toast } = useFeedback();
  const planned = parsePlanned(scheduled);

  const [label, setLabel] = useState(planned.label ?? '');
  const [intervals, setIntervals] = useState(planned.intervals ?? '');
  const [distance, setDistance] = useState(
    planned.distance_m != null ? metersToDisplay(planned.distance_m, units.distance).toFixed(1) : '',
  );
  const [pace, setPace] = useState(
    planned.target_pace_s_per_km != null ? formatPace(planned.target_pace_s_per_km, units.distance).split('/')[0] : '',
  );
  const [exercises, setExercises] = useState<StrengthExercise[]>(planned.exercises ?? []);

  const mob = mobilitySuggestions(scheduled.type, injuries, planned.split);

  const saveEdits = async () => {
    const next: PlannedDetails = {
      ...planned,
      label: label || undefined,
      intervals: intervals || undefined,
      distance_m: distance.trim() ? displayToMeters(parseFloat(distance), units.distance) : undefined,
      target_pace_s_per_km: parsePaceInput(pace, units.distance) ?? planned.target_pace_s_per_km,
      exercises: scheduled.type === 'strength' ? exercises : planned.exercises,
    };
    await updateScheduled(scheduled.id, { planned_json: stringifyPlanned(next) });
    onChanged();
    toast('Session updated');
  };

  const markDone = async () => {
    const sessionId = await createSession({
      date: scheduled.date,
      type: scheduled.type,
      source: 'manual',
      duration_s: planned.duration_s ?? null,
      distance_m: planned.distance_m ?? null,
      avg_pace_s_per_km: planned.target_pace_s_per_km ?? null,
      avg_hr: null,
      rpe: null,
      notes: null,
      shoe_id: null,
    });
    if (scheduled.type === 'strength' && exercises.length > 0) {
      await setStrengthForSession(sessionId, exercises);
    }
    await setScheduledStatus(scheduled.id, 'done', sessionId);
    onChanged();
    toast('Marked done & logged ✓');
    navigation.replace('SessionEdit', { sessionId });
  };

  const confirmDelete = async () => {
    const ok = await confirm({
      title: 'Delete session?',
      message: 'This removes it from the plan.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) {
      await deleteScheduled(scheduled.id);
      navigation.goBack();
    }
  };

  return (
    <ScreenScroll>
      <Row gap={2} style={{ marginBottom: t.spacing(2) }}>
        <Text style={{ color: t.colors.textMuted, fontWeight: '700' }}>{scheduled.date}</Text>
        <Text style={{ color: t.colors.textMuted }}>· {scheduled.phase} · {scheduled.status}</Text>
      </Row>

      <Field label="Title" value={label} onChangeText={setLabel} />
      <Field label="Workout / structure" value={intervals} onChangeText={setIntervals} multiline />
      <Row gap={3}>
        <View style={{ flex: 1 }}>
          <Field label={`Distance (${units.distance})`} value={distance} onChangeText={setDistance} keyboardType="decimal-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label={`Target pace (mm:ss/${units.distance})`}
            value={pace}
            onChangeText={setPace}
            onBlur={() => {
              const secKm = parsePaceInput(pace, units.distance);
              if (secKm != null) setPace(formatPace(secKm, units.distance).split('/')[0]);
            }}
            keyboardType="numeric"
          />
        </View>
      </Row>

      {planned.rationale ? (
        <Card style={{ backgroundColor: t.colors.surfaceAlt }}>
          <Label>Why this workout</Label>
          <Body muted>{planned.rationale}</Body>
        </Card>
      ) : null}

      {scheduled.type === 'strength' ? (
        <ExerciseEditor exercises={exercises} onChange={setExercises} weightUnit={units.weight} />
      ) : null}

      <Button title="Save edits" onPress={saveEdits} />
      <View style={{ height: t.spacing(2) }} />
      <Button title="✓ Mark done & log" variant="secondary" onPress={markDone} />

      <Divider />
      <Label>Can't do this session?</Label>
      <Body muted style={{ marginBottom: t.spacing(3) }}>No silent gaps — pick what happens to it:</Body>

      <SkipAction
        title="Push"
        description="Move it to your next free day so you still get the session in."
        onPress={async () => {
          const to = await pushSession(scheduled);
          onChanged();
          toast(`Pushed to ${to}`);
          navigation.goBack();
        }}
      />
      <SkipAction
        title="Fold in"
        description="Skip it now and add its work to your next matching session."
        onPress={async () => {
          const ok = await foldSession(scheduled);
          onChanged();
          toast(ok ? 'Folded into your next session' : 'No later session — marked skipped');
          navigation.goBack();
        }}
      />
      <SkipAction
        title="Drop"
        description="Skip it with no make-up. It's logged as skipped, not deleted."
        onPress={async () => {
          await dropSession(scheduled);
          onChanged();
          toast('Marked skipped');
          navigation.goBack();
        }}
      />
      <View style={{ height: t.spacing(2) }} />

      {mob.length > 0 ? (
        <Card style={{ backgroundColor: t.colors.surfaceAlt }}>
          <Label>Optional mobility</Label>
          {mob.map((b) => (
            <View key={b.id} style={{ marginTop: t.spacing(2) }}>
              <Text style={{ color: t.colors.text, fontWeight: '700', fontSize: 14 }}>
                {b.title} · {b.durationMin} min{b.reason ? ` · ${b.reason}` : ''}
              </Text>
              <Text style={{ color: t.colors.textMuted, fontSize: 13 }}>{b.items.join(' · ')}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      <Button title="Delete from plan" variant="danger" onPress={confirmDelete} />
    </ScreenScroll>
  );
}

// ---------------------------------------------------------------------------
function LoggedEditor({
  session,
  strength,
  shoes,
  onDeleted,
}: {
  session: Session;
  strength: StrengthExercise[];
  shoes: Shoe[];
  onDeleted: () => void;
}) {
  const t = useTheme();
  const units = useUnits();
  const { confirm, toast } = useFeedback();

  const [distance, setDistance] = useState(
    session.distance_m != null ? metersToDisplay(session.distance_m, units.distance).toFixed(2) : '',
  );
  const [duration, setDuration] = useState(session.duration_s != null ? String(Math.round(session.duration_s / 60)) : '');
  const [hr, setHr] = useState(session.avg_hr != null ? String(session.avg_hr) : '');
  const [rpe, setRpe] = useState(session.rpe != null ? String(session.rpe) : '');
  const [notes, setNotes] = useState(session.notes ?? '');
  const [shoeId, setShoeId] = useState<number | null>(session.shoe_id);
  const [exercises, setExercises] = useState<StrengthExercise[]>(strength);

  const save = async () => {
    const distM = distance.trim() ? displayToMeters(parseFloat(distance), units.distance) : null;
    const durS = duration.trim() ? parseGoalTime(duration) : null;
    const pace = distM && durS ? durS / (distM / 1000) : session.avg_pace_s_per_km;
    await updateSession(session.id, {
      distance_m: distM,
      duration_s: durS,
      avg_pace_s_per_km: pace,
      avg_hr: hr.trim() ? parseInt(hr, 10) : null,
      rpe: rpe.trim() ? parseInt(rpe, 10) : null,
      notes: notes || null,
      shoe_id: shoeId,
    });
    if (session.type === 'strength') {
      await setStrengthForSession(session.id, exercises);
    }
    toast('Log saved');
  };

  const confirmDelete = async () => {
    const ok = await confirm({
      title: 'Delete log?',
      message: 'This permanently removes this logged session.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) {
      await deleteSession(session.id);
      onDeleted();
    }
  };

  return (
    <ScreenScroll>
      <Row gap={2} style={{ marginBottom: t.spacing(2) }}>
        <Text style={{ color: t.colors.textMuted, fontWeight: '700' }}>{session.date}</Text>
        <Text style={{ color: t.colors.textMuted }}>· {session.type} · {session.source}</Text>
      </Row>

      {session.type !== 'strength' ? (
        <>
          <Row gap={3}>
            <View style={{ flex: 1 }}>
              <Field label={`Distance (${units.distance})`} value={distance} onChangeText={setDistance} keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Duration (type 4530 → 45:30)"
                value={duration}
                onChangeText={setDuration}
                onBlur={() => setDuration(normalizeTimeInput(duration))}
                keyboardType="numeric"
              />
            </View>
          </Row>
          <Row gap={3}>
            <View style={{ flex: 1 }}>
              <Field label="Avg HR" value={hr} onChangeText={setHr} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="RPE (1–10)" value={rpe} onChangeText={setRpe} onBlur={() => setRpe(clampRpe(rpe))} keyboardType="numeric" />
            </View>
          </Row>
        </>
      ) : (
        <Field label="RPE (1–10)" value={rpe} onChangeText={setRpe} onBlur={() => setRpe(clampRpe(rpe))} keyboardType="numeric" />
      )}

      {session.type === 'strength' ? (
        <ExerciseEditor exercises={exercises} onChange={setExercises} weightUnit={units.weight} />
      ) : null}

      {shoes.length > 0 && session.type === 'run' ? (
        <Card>
          <Label>Shoes</Label>
          <Row gap={2} style={{ flexWrap: 'wrap' }}>
            <Button title="None" variant={shoeId == null ? 'primary' : 'secondary'} small onPress={() => setShoeId(null)} />
            {shoes.map((s) => (
              <Button key={s.id} title={s.name} variant={shoeId === s.id ? 'primary' : 'secondary'} small onPress={() => setShoeId(s.id)} />
            ))}
          </Row>
        </Card>
      ) : null}

      <Field label="Notes" value={notes} onChangeText={setNotes} multiline />

      <Button title="Save log" onPress={save} />
      <View style={{ height: t.spacing(2) }} />
      <Button title="Delete log" variant="danger" onPress={confirmDelete} />
    </ScreenScroll>
  );
}

// A skip action with a one-line explanation of what it does (Push / Fold in / Drop).
function SkipAction({
  title,
  description,
  onPress,
}: {
  title: string;
  description: string;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing(3), marginBottom: t.spacing(2) }}>
      <View style={{ width: 104 }}>
        <Button title={title} variant="secondary" small onPress={onPress} style={{ width: '100%' }} />
      </View>
      <Text style={{ color: t.colors.textMuted, fontSize: 13, flex: 1 }}>{description}</Text>
    </View>
  );
}
