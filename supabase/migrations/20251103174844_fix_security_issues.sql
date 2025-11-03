/*
  # Fix Security Issues

  ## Changes Made

  1. **Added Missing Indexes**
     - Add index on scorer_submissions(game_id) for foreign key
     - Add index on scorer_submissions(team_id) for foreign key

  2. **Remove Duplicate RLS Policies**
     - Drop duplicate "Anyone can..." policies (keep "Public..." policies)
     - Removes redundant policies on games, teams, submissions, and scores tables

  3. **Drop Unused Indexes**
     - Remove idx_teams_game_id (covered by unique constraint)
     - Remove idx_submissions_team_id (covered by unique constraint)
     - Remove idx_submissions_round (not needed for query patterns)
     - Remove idx_scores_game_id (covered by unique constraint)
     - Remove idx_scores_team_id (covered by unique constraint)
     - Remove idx_scores_round (not needed for query patterns)

  4. **Fix Function Search Path**
     - Set search_path to empty for update_updated_at_column function
     - Prevents security issues from mutable search paths

  ## Security Impact
  - Improves query performance with proper indexes
  - Eliminates policy confusion from duplicates
  - Reduces index maintenance overhead
  - Hardens function against search path attacks
*/

-- 1. Add missing indexes for scorer_submissions foreign keys
CREATE INDEX IF NOT EXISTS idx_scorer_submissions_game_id ON scorer_submissions(game_id);
CREATE INDEX IF NOT EXISTS idx_scorer_submissions_team_id ON scorer_submissions(team_id);

-- 2. Remove duplicate RLS policies (keep the "Public..." named ones)
DROP POLICY IF EXISTS "Anyone can view games" ON games;
DROP POLICY IF EXISTS "Anyone can create games" ON games;
DROP POLICY IF EXISTS "Anyone can update games" ON games;
DROP POLICY IF EXISTS "Anyone can delete games" ON games;

DROP POLICY IF EXISTS "Anyone can view teams" ON teams;
DROP POLICY IF EXISTS "Anyone can create teams" ON teams;
DROP POLICY IF EXISTS "Anyone can update teams" ON teams;
DROP POLICY IF EXISTS "Anyone can delete teams" ON teams;

DROP POLICY IF EXISTS "Anyone can view submissions" ON submissions;
DROP POLICY IF EXISTS "Anyone can create submissions" ON submissions;
DROP POLICY IF EXISTS "Anyone can update submissions" ON submissions;
DROP POLICY IF EXISTS "Anyone can delete submissions" ON submissions;

DROP POLICY IF EXISTS "Anyone can view scores" ON scores;
DROP POLICY IF EXISTS "Anyone can create scores" ON scores;
DROP POLICY IF EXISTS "Anyone can update scores" ON scores;
DROP POLICY IF EXISTS "Anyone can delete scores" ON scores;

-- 3. Drop unused indexes (these are redundant with unique constraints or not used)
DROP INDEX IF EXISTS idx_teams_game_id;
DROP INDEX IF EXISTS idx_submissions_team_id;
DROP INDEX IF EXISTS idx_submissions_round;
DROP INDEX IF EXISTS idx_scores_game_id;
DROP INDEX IF EXISTS idx_scores_team_id;
DROP INDEX IF EXISTS idx_scores_round;

-- 4. Fix function search path security issue
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '';
