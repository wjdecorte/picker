CREATE TABLE dashboard (
  id text PRIMARY KEY,
  payload jsonb NOT NULL,
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0)
);
CREATE TABLE games (
  ordinal bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  id text PRIMARY KEY,
  season integer NOT NULL,
  week integer NOT NULL CHECK (week BETWEEN 1 AND 22),
  game_date date NOT NULL,
  away_team text NOT NULL,
  home_team text NOT NULL CHECK (home_team <> away_team),
  external_id text UNIQUE,
  kickoff_time timestamptz,
  away_score integer CHECK (away_score >= 0),
  home_score integer CHECK (home_score >= 0),
  status text NOT NULL,
  completed_at timestamptz,
  official_version_id text,
  payload jsonb NOT NULL,
  UNIQUE (season, week, game_date, away_team, home_team),
  CHECK (status <> 'Complete' OR (away_score IS NOT NULL AND home_score IS NOT NULL))
);
CREATE TABLE pick_cards (
  ordinal bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  id text PRIMARY KEY,
  season integer NOT NULL,
  week integer NOT NULL CHECK (week BETWEEN 1 AND 22),
  card_type text NOT NULL,
  analysis_date date,
  immutable boolean NOT NULL DEFAULT false,
  payload jsonb NOT NULL
);
CREATE TABLE pick_versions (
  ordinal bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  id text PRIMARY KEY,
  game_id text NOT NULL REFERENCES games(id),
  pick_card_id text NOT NULL REFERENCES pick_cards(id),
  pick_team text NOT NULL,
  pick_spread double precision NOT NULL,
  confidence double precision CHECK (confidence BETWEEN 1 AND 10),
  classification text NOT NULL,
  analysis_timestamp timestamptz,
  reference_version_id text REFERENCES pick_versions(id) DEFERRABLE INITIALLY DEFERRED,
  payload jsonb NOT NULL,
  UNIQUE (id, game_id)
);
ALTER TABLE games ADD CONSTRAINT official_version_game_fk
  FOREIGN KEY (official_version_id, id) REFERENCES pick_versions(id, game_id) DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE pick_results (
  id text PRIMARY KEY,
  pick_version_id text NOT NULL UNIQUE REFERENCES pick_versions(id),
  ats_result text NOT NULL CHECK (ats_result IN ('Win','Loss','Push')),
  cover_margin double precision NOT NULL,
  graded_at timestamptz NOT NULL
);
CREATE TABLE actual_bets (
  ordinal bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  id text PRIMARY KEY,
  game_id text NOT NULL REFERENCES games(id),
  pick_version_id text,
  payload jsonb NOT NULL,
  FOREIGN KEY (pick_version_id, game_id) REFERENCES pick_versions(id, game_id) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX games_season_week_idx ON games(season, week);
CREATE INDEX versions_card_game_idx ON pick_versions(pick_card_id, game_id);
CREATE INDEX bets_game_idx ON actual_bets(game_id);
CREATE FUNCTION prevent_prediction_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Saved pick versions are immutable and cannot be updated or deleted';
END;
$$;
CREATE TRIGGER immutable_pick_versions BEFORE UPDATE OR DELETE ON pick_versions
  FOR EACH ROW EXECUTE FUNCTION prevent_prediction_mutation();
CREATE FUNCTION protect_sealed_card() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.immutable THEN RAISE EXCEPTION 'Finalized pick cards are immutable'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER immutable_pick_cards BEFORE UPDATE OR DELETE ON pick_cards
  FOR EACH ROW EXECUTE FUNCTION protect_sealed_card();
