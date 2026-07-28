import type * as SQLite from 'expo-sqlite';

// Versioned, forward-only migrations. Keyed on PRAGMA user_version so the schema
// can evolve safely even though this is a single-user app (spec requirement).
// To change the schema: append a new { version: N, up } entry — never edit an old one.

interface Migration {
  version: number;
  up: string;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    up: `
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        units_distance TEXT NOT NULL DEFAULT 'km',
        units_weight TEXT NOT NULL DEFAULT 'kg',
        theme TEXT NOT NULL DEFAULT 'system',
        weekly_mileage_km REAL,
        hr_zone_updated_at TEXT,
        strava_connected INTEGER NOT NULL DEFAULT 0,
        garmin_connected INTEGER NOT NULL DEFAULT 0
      );
      INSERT OR IGNORE INTO settings (id) VALUES (1);

      CREATE TABLE IF NOT EXISTS plan_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        race_distance TEXT NOT NULL,
        race_date TEXT NOT NULL,
        goal_seconds INTEGER,
        weekly_frequency INTEGER NOT NULL DEFAULT 5,
        start_date TEXT NOT NULL,
        structure_json TEXT NOT NULL,
        strength_split_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS scheduled_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        phase TEXT NOT NULL,
        planned_json TEXT NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'planned',
        flag_reason TEXT,
        template_id INTEGER,
        linked_session_id INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_scheduled_date ON scheduled_sessions (date);

      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'manual',
        duration_s INTEGER,
        distance_m REAL,
        avg_pace_s_per_km REAL,
        avg_hr INTEGER,
        rpe INTEGER,
        notes TEXT,
        shoe_id INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions (date);

      CREATE TABLE IF NOT EXISTS strength_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        exercises_json TEXT NOT NULL DEFAULT '[]'
      );

      CREATE TABLE IF NOT EXISTS readiness_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        sleep_quality INTEGER,
        soreness INTEGER,
        pain_location TEXT,
        pain_severity INTEGER,
        notes TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_readiness_date ON readiness_logs (date);

      CREATE TABLE IF NOT EXISTS injury_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        location TEXT NOT NULL,
        started_date TEXT NOT NULL,
        resolved_date TEXT,
        severity INTEGER,
        status TEXT NOT NULL DEFAULT 'active',
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS shoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        purchased_date TEXT,
        threshold_km REAL NOT NULL DEFAULT 700,
        retired INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS physique_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        bodyweight REAL,
        unit TEXT NOT NULL DEFAULT 'kg',
        photo_uri TEXT,
        notes TEXT
      );
    `,
  },
  {
    // User profile — tailors HR zones (from age/sex) and default strength loads (from bodyweight).
    version: 2,
    up: `
      ALTER TABLE settings ADD COLUMN sex TEXT;
      ALTER TABLE settings ADD COLUMN birth_year INTEGER;
      ALTER TABLE settings ADD COLUMN height_cm REAL;
      ALTER TABLE settings ADD COLUMN bodyweight_kg REAL;
    `,
  },
  {
    // Equipment preference (default) + named, chainable races (multi-race support).
    version: 3,
    up: `
      ALTER TABLE settings ADD COLUMN equipment TEXT NOT NULL DEFAULT 'full_gym';
      ALTER TABLE plan_templates ADD COLUMN name TEXT;
      ALTER TABLE plan_templates ADD COLUMN equipment TEXT NOT NULL DEFAULT 'full_gym';
      ALTER TABLE plan_templates ADD COLUMN chained_from_id INTEGER;
      ALTER TABLE plan_templates ADD COLUMN baseline_weekly_km REAL;
    `,
  },
];

export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let current = row?.user_version ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version > current) {
      await db.withTransactionAsync(async () => {
        await db.execAsync(migration.up);
      });
      // user_version can't be parameterized; migration.version is a trusted integer constant.
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
      current = migration.version;
    }
  }
}

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;
