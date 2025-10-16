/*
  # Enable Realtime Replica Identity

  ## Overview
  Enables REPLICA IDENTITY FULL on all tables to ensure real-time subscriptions
  receive complete row data for UPDATE events. This is critical for postgres_changes
  listeners to work properly.

  ## Changes
  - Enable REPLICA IDENTITY FULL on games table
  - Enable REPLICA IDENTITY FULL on teams table
  - Enable REPLICA IDENTITY FULL on submissions table
  - Enable REPLICA IDENTITY FULL on scores table

  ## Why This Matters
  Without REPLICA IDENTITY FULL, Supabase real-time only receives the primary key
  in UPDATE events, not the full row data. This causes the UI to not update properly.
*/

ALTER TABLE games REPLICA IDENTITY FULL;
ALTER TABLE teams REPLICA IDENTITY FULL;
ALTER TABLE submissions REPLICA IDENTITY FULL;
ALTER TABLE scores REPLICA IDENTITY FULL;
