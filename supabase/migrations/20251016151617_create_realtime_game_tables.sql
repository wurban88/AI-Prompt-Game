/*
  # Real-time Prompt Wars Game Schema

  ## Overview
  Creates tables for multi-device real-time collaboration in Prompt Wars.
  All participants can see live updates across devices as teams enter prompts,
  scores are added, and game state changes.

  ## New Tables

  ### `games`
  - `id` (uuid, primary key)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  - `rounds` (integer) - Total rounds
  - `current_round` (integer) - Current round number
  - `mode` (text) - Challenge mode
  - `round_length` (integer) - Round time in seconds
  - `twist_enabled` (boolean) - Twist round enabled
  - `phase` (text) - Current phase
  - `current_challenge` (jsonb) - Challenge data
  - `current_twist` (text) - Twist text
  - `time_left` (integer) - Remaining seconds
  - `is_running` (boolean) - Timer running

  ### `teams`
  - `id` (uuid, primary key)
  - `game_id` (uuid, foreign key)
  - `name` (text)
  - `score` (integer)
  - `created_at` (timestamptz)

  ### `submissions`
  - `id` (uuid, primary key)
  - `game_id` (uuid, foreign key)
  - `team_id` (uuid, foreign key)
  - `round` (integer)
  - `prompt` (text)
  - `output` (text)
  - `notes` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `scores`
  - `id` (uuid, primary key)
  - `game_id` (uuid, foreign key)
  - `team_id` (uuid, foreign key)
  - `round` (integer)
  - `creativity` (integer)
  - `clarity` (integer)
  - `power` (integer)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Public access for collaborative gameplay
*/

CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  rounds integer DEFAULT 3,
  current_round integer DEFAULT 1,
  mode text DEFAULT 'Any',
  round_length integer DEFAULT 180,
  twist_enabled boolean DEFAULT true,
  phase text DEFAULT 'setup',
  current_challenge jsonb,
  current_twist text,
  time_left integer DEFAULT 180,
  is_running boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  score integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  round integer NOT NULL,
  prompt text DEFAULT '',
  output text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(game_id, team_id, round)
);

CREATE TABLE IF NOT EXISTS scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  round integer NOT NULL,
  creativity integer DEFAULT 0,
  clarity integer DEFAULT 0,
  power integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(game_id, team_id, round)
);

ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read games" ON games FOR SELECT USING (true);
CREATE POLICY "Public insert games" ON games FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update games" ON games FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete games" ON games FOR DELETE USING (true);

CREATE POLICY "Public read teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Public insert teams" ON teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update teams" ON teams FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete teams" ON teams FOR DELETE USING (true);

CREATE POLICY "Public read submissions" ON submissions FOR SELECT USING (true);
CREATE POLICY "Public insert submissions" ON submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update submissions" ON submissions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete submissions" ON submissions FOR DELETE USING (true);

CREATE POLICY "Public read scores" ON scores FOR SELECT USING (true);
CREATE POLICY "Public insert scores" ON scores FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update scores" ON scores FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete scores" ON scores FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_teams_game_id ON teams(game_id);
CREATE INDEX IF NOT EXISTS idx_submissions_game_id ON submissions(game_id);
CREATE INDEX IF NOT EXISTS idx_submissions_team_id ON submissions(team_id);
CREATE INDEX IF NOT EXISTS idx_scores_game_id ON scores(game_id);
CREATE INDEX IF NOT EXISTS idx_scores_team_id ON scores(team_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_games_updated_at ON games;
CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_submissions_updated_at ON submissions;
CREATE TRIGGER update_submissions_updated_at
  BEFORE UPDATE ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_scores_updated_at ON scores;
CREATE TRIGGER update_scores_updated_at
  BEFORE UPDATE ON scores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();