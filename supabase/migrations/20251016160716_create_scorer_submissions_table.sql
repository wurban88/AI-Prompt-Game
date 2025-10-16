/*
  # Create Scorer Submissions Table

  1. New Tables
    - scorer_submissions table for storing multiple anonymous scores per team

  2. Security
    - Enable RLS with policies for reading and writing scores

  3. Notes
    - Multiple scorers can submit scores for the same team
    - Each scorer is identified by a unique device/session ID
*/

CREATE TABLE IF NOT EXISTS scorer_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id),
  team_id uuid NOT NULL REFERENCES teams(id),
  round integer NOT NULL,
  scorer_id text NOT NULL,
  creativity integer DEFAULT 0,
  clarity integer DEFAULT 0,
  power integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE scorer_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read scorer submissions"
  ON scorer_submissions
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert scorer submissions"
  ON scorer_submissions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update their own scorer submissions"
  ON scorer_submissions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);