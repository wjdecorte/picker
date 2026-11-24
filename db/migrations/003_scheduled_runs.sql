CREATE TABLE scheduled_runs (
  slot text PRIMARY KEY,
  season integer NOT NULL,
  week integer NOT NULL CHECK (week BETWEEN 1 AND 18),
  kind text NOT NULL CHECK (kind IN ('week-start','sunday')),
  run_at timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('running','completed','failed','manual')),
  attempts integer NOT NULL DEFAULT 0,
  run_id uuid,
  message text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
