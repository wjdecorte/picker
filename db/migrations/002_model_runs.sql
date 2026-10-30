CREATE TABLE model_runs (
  id uuid PRIMARY KEY,
  season integer NOT NULL,
  week integer NOT NULL CHECK (week BETWEEN 1 AND 18),
  status text NOT NULL CHECK (status IN ('running','completed','failed')),
  model text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX model_runs_week_idx ON model_runs(season,week,created_at DESC);
